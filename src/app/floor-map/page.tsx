import FloorMap from '@/components/pos/floor-map'

export const dynamic = 'force-dynamic'

export default function FloorMapPage() {
    return (
        <div className="h-screen w-full bg-background overflow-hidden">
            <FloorMap />
        </div>
    )
}
