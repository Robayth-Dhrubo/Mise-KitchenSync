'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface PlaceV1 {
    name: string // resource name: places/PLACE_ID
    id: string // The actual place ID
    displayName?: { text: string }
    formattedAddress?: string
    rating?: number
    location?: {
        latitude: number
        longitude: number
    }
    nationalPhoneNumber?: string
    websiteUri?: string
}

interface PlacesV1Response {
    places?: PlaceV1[]
    error?: {
        code: number
        message: string
        status: string
    }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

/**
 * Discover local vendors using Google Places API (New v1)
 */
export async function discoverLocalVendors(radiusKm: number = 50) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get restaurant coordinates from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_lat, restaurant_lng, restaurant_address')
        .eq('id', user.id)
        .single()

    if (!profile?.restaurant_lat || !profile?.restaurant_lng) {
        return {
            success: false,
            error: 'MISSING_LOCATION'
        }
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
        return { success: false, error: 'Google Places API key not configured service-side' }
    }

    // Get blacklisted place IDs
    const { data: blacklist } = await supabase
        .from('vendor_blacklist')
        .select('google_place_id')
        .eq('user_id', user.id)

    const blacklistedIds = new Set(blacklist?.map(b => b.google_place_id) || [])

    // Get existing suppliers to avoid duplicates
    const { data: existingSuppliers } = await supabase
        .from('suppliers')
        .select('google_place_id')
        .eq('user_id', user.id)
        .not('google_place_id', 'is', null)

    const existingIds = new Set(existingSuppliers?.map(s => s.google_place_id) || [])

    const radiusMeters = radiusKm * 1000
    // Using New Places API Types
    // Using New Places API Types - strictly valid ones
    const includedTypes = ['grocery_store', 'supermarket', 'convenience_store']

    let allPlaces: PlaceV1[] = []

    // Try New Places API first
    try {
        console.log('Attempting New Places API (v1)...')
        const nearbyUrl = 'https://places.googleapis.com/v1/places:searchNearby'
        const textUrl = 'https://places.googleapis.com/v1/places:searchText'

        // 1. Nearby Search (Retail/Local)
        const nearbyPromise = fetch(nearbyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.websiteUri,places.nationalPhoneNumber'
            },
            body: JSON.stringify({
                includedTypes: [...includedTypes, 'wholesaler', 'warehouse_store', 'market'],
                maxResultCount: 20,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: profile.restaurant_lat,
                            longitude: profile.restaurant_lng
                        },
                        radius: radiusMeters
                    }
                }
            })
        })

        // 2. Text Search (Major Distributors)
        const textPromise = fetch(textUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.websiteUri,places.nationalPhoneNumber'
            },
            body: JSON.stringify({
                textQuery: "Food Service Distributor",
                maxResultCount: 10,
                locationBias: {
                    circle: {
                        center: {
                            latitude: profile.restaurant_lat,
                            longitude: profile.restaurant_lng
                        },
                        radius: radiusMeters
                    }
                }
            })
        })

        // Run both in parallel
        const [nearbyRes, textRes] = await Promise.all([nearbyPromise, textPromise])
        const nearbyData = await nearbyRes.json()
        const textData = await textRes.json()

        if (nearbyData.places) {
            allPlaces.push(...nearbyData.places)
        }
        if (textData.places) {
            // Deduplicate by ID
            const existingIds = new Set(allPlaces.map(p => p.id))
            const newDistributors = textData.places.filter((p: PlaceV1) => !existingIds.has(p.id))
            allPlaces.push(...newDistributors)
        }

        console.log(`Discovery complete. Found ${allPlaces.length} total vendors.`)

    } catch (newApiError: any) {
        console.warn('New Places API failed, attempting Legacy API fallback...', newApiError.message)

        // FALLBACK: Legacy Places API
        try {
            const lat = profile.restaurant_lat
            const lng = profile.restaurant_lng
            // specific types for legacy
            const legacyType = 'grocery_or_supermarket'
            const legacyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${legacyType}&key=${apiKey}`

            const legacyRes = await fetch(legacyUrl)
            const legacyData = await legacyRes.json()

            if (legacyData.status !== 'OK' && legacyData.status !== 'ZERO_RESULTS') {
                console.error('Legacy Places API Error:', legacyData)
                // If both fail, return original error or legacy error
                return { success: false, error: `Both APIs failed. New: ${newApiError.message}. Legacy: ${legacyData.error_message || legacyData.status}` }
            }

            if (legacyData.results) {
                console.log(`Legacy Places API found ${legacyData.results.length} results`)
                // Map legacy format to PlaceV1 format
                allPlaces = legacyData.results.map((r: any) => ({
                    id: r.place_id,
                    name: r.name, // Legacy doesn't use 'places/ID' resource name, but that's fine for our ID use
                    displayName: { text: r.name },
                    formattedAddress: r.vicinity, // Legacy uses vicinity
                    rating: r.rating,
                    location: {
                        latitude: r.geometry.location.lat,
                        longitude: r.geometry.location.lng
                    },
                    // Legacy search doesn't return phone/website in list view, requires detail fetch.
                    // We'll leave them undefined for now or handle gracefully.
                    nationalPhoneNumber: undefined,
                    websiteUri: undefined
                }))
            }

        } catch (legacyError) {
            console.error('Legacy catch error:', legacyError)
            return { success: false, error: `API Connection Failed: ${newApiError.message}` }
        }
    }

    // Filter and process results
    const vendorsToAdd: Array<{
        user_id: string
        name: string
        email: string | null
        address: string
        phone: string | null
        website: string | null
        rating: number | null
        distance_km: number
        google_place_id: string
        source: string
        is_approved: boolean
    }> = []

    for (const place of allPlaces) {
        const placeId = place.id

        // Skip blacklisted
        if (blacklistedIds.has(placeId)) continue

        // Skip existing
        if (existingIds.has(placeId)) continue

        // Filter by rating (quality check)
        if (place.rating && place.rating < 3.0) continue

        // Calculate distance
        const distance = calculateDistance(
            profile.restaurant_lat,
            profile.restaurant_lng,
            place.location!.latitude,
            place.location!.longitude
        )

        vendorsToAdd.push({
            user_id: user.id,
            name: place.displayName?.text || 'Unknown Vendor',
            email: null,
            address: place.formattedAddress || 'No address',
            phone: place.nationalPhoneNumber || null,
            website: place.websiteUri || null,
            rating: place.rating || null,
            distance_km: Math.round(distance * 10) / 10,
            google_place_id: placeId,
            source: 'auto_discovered',
            is_approved: false // Needs manual approval
        })
    }

    // Insert new vendors
    if (vendorsToAdd.length > 0) {
        const { error: insertError } = await supabase
            .from('suppliers')
            .insert(vendorsToAdd)

        if (insertError) {
            console.error('Failed to insert vendors:', insertError)
            return { success: false, error: insertError.message }
        }
    }

    revalidatePath('/inventory')

    return {
        success: true,
        discovered: vendorsToAdd.length,
        message: `Found ${vendorsToAdd.length} new vendors within ${radiusKm}km`
    }
}

/**
 * Approve a discovered vendor (add to active suppliers)
 */
export async function approveDiscoveredVendor(vendorId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('suppliers')
        .update({ is_approved: true })
        .eq('id', vendorId)
        .eq('user_id', user.id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
}

/**
 * Ban a discovered vendor (add to blacklist and remove)
 */
export async function banDiscoveredVendor(vendorId: string, reason?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get vendor details
    const { data: vendor } = await supabase
        .from('suppliers')
        .select('google_place_id, name')
        .eq('id', vendorId)
        .eq('user_id', user.id)
        .single()

    if (vendor?.google_place_id) {
        // Add to blacklist only if it has a google place id
        const { error: blacklistError } = await supabase
            .from('vendor_blacklist')
            .insert({
                user_id: user.id,
                google_place_id: vendor.google_place_id,
                vendor_name: vendor.name,
                reason: reason || 'User banned'
            })
        if (blacklistError && !blacklistError.message.includes('duplicate')) {
            console.error('Error blacklisting:', blacklistError)
        }
    }

    // Delete the vendor
    const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', vendorId)
        .eq('user_id', user.id)

    if (deleteError) {
        return { success: false, error: deleteError.message }
    }

    revalidatePath('/inventory')
    return { success: true }
}

/**
 * Delete ANY vendor (active or discovered)
 */
export async function deleteVendor(vendorId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // 1. Delete related vendor_products first (manual cascade)
    const { error: productsError } = await supabase
        .from('vendor_products')
        .delete()
        .eq('vendor_id', vendorId)
        .eq('user_id', user.id)

    if (productsError) {
        console.error('Error deleting vendor products:', productsError)
    }

    // 2. Unlink from shopping_list (set vendor_id to null)
    const { error: shoppingError } = await supabase
        .from('shopping_list')
        .update({ vendor_id: null })
        .eq('vendor_id', vendorId)
        .eq('user_id', user.id)

    if (shoppingError) {
        console.error('Error unlinking list items:', shoppingError)
    }

    // 3. Delete the vendor record
    const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', vendorId)
        .eq('user_id', user.id)

    if (deleteError) {
        console.error('SERVER DELETE ERROR:', deleteError)
        return { success: false, error: `DB Error: ${deleteError.message} (Code: ${deleteError.code})` }
    }



    revalidatePath('/inventory')
    return { success: true }
}


/**
 * Update restaurant location
 */
export async function updateRestaurantLocation(
    lat: number,
    lng: number,
    address?: string
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            restaurant_lat: lat,
            restaurant_lng: lng,
            restaurant_address: address
        })
        .eq('id', user.id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
}

/**
 * RESET/PURGE ALL VENDORS
 * CAUTION: This deletes all vendors and unlinks shopping lists.
 */
export async function resetVendors() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // 1. Unlink shopping lists
    await supabase.from('shopping_list').update({ vendor_id: null }).eq('user_id', user.id)

    // 2. Delete vendor products
    await supabase.from('vendor_products').delete().eq('user_id', user.id)

    // 3. Delete blacklist
    await supabase.from('vendor_blacklist').delete().eq('user_id', user.id)

    // 4. Delete suppliers
    const { error } = await supabase.from('suppliers').delete().eq('user_id', user.id)

    if (error) {
        console.error('Reset Vendor Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
}
