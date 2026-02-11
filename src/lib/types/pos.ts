export type LocationType = 'table' | 'room' | 'wall' | 'kitchen' | 'restroom' | 'bar' | 'entrance' | 'obstacle' | 'service_point'
export type LocationStatus = 'available' | 'occupied' | 'dirty' | 'reserved'
export type ReservationStatus = 'confirmed' | 'seated' | 'cancelled' | 'noshow'
export type OrderStatus = 'pending' | 'firing' | 'completed' | 'cancelled' | 'received' | 'preparing' | 'ready' | 'delivered'
export type OrderType = 'dine_in' | 'room_service' | 'takeaway'

export interface Location {
    id: string
    user_id: string
    name: string
    type: LocationType
    status: LocationStatus
    x_pos: number
    y_pos: number
    width: number
    height: number
    rotation: number
    capacity: number
    metadata?: any
    created_at?: string
}

export interface Reservation {
    id: string
    user_id: string
    location_id: string
    guest_name: string
    guest_count: number
    reservation_time: string
    status: ReservationStatus
    notes?: string
    created_at?: string
    location?: Location
}

export interface POSOrder {
    id: string
    user_id: string
    location_id?: string
    type: OrderType
    total_amount: number
    preparation_status: OrderStatus
    is_preorder: boolean
    scheduled_for?: string
    created_at: string
    location?: Location
    order_items?: POSOrderItem[]
    guest_name?: string
    tracking_pin?: string
}

export interface POSOrderItem {
    id: string
    order_id: string
    recipe_id: string
    quantity: number
    unit_price: number
    notes?: string
    recipe?: {
        name: string
        image_url?: string
    }
}

export interface Recipe {
    id: string
    name: string
    category: string
    price: number
    description?: string
    image_url?: string
}

export interface Ingredient {
    id: string
    name: string
    purchase_unit: string
}

export interface RecipeItem {
    id: string
    recipe_id: string
    ingredient_id: string
    quantity_needed: number
    unit_used: string
    ingredient?: Ingredient
}
