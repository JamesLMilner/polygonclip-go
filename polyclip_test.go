import . "polyclip"
import "testing"

polyOne := Polygon{ 
    Points{
        Point{ 181, 270 },
        Point{ 85 , 418 },
        Point{ 171, 477 },
        Point{ 491, 365 },
        Point{ 218, 381 },
        Point{ 458, 260 },
    }
}


polyTwo := Polygon{ 
    Points{
        Point{ 474, 488 },
        Point{ 659, 363 },
        Point{ 255, 283 },
        Point{ 56 , 340 },
        Point{ 284, 488 },
        Point{ 371, 342 },
    }
}


TestPolyclip(t *testing.T) {

    clip := PolygonClip(polyOne, polyTwo, true, true)
    
}
