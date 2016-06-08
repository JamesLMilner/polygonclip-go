	package polyclip
	
	type Point struct {
        X float64
        Y float64
    }
    
    type Polygon struct {
        Points []Point
    }
    
	
	type Node struct {
		Poly Polygon
		Index int
		Point Point
		Intersect bool
		Next Node
		Prev Node
		IsEntry bool
		Friend Node
		Processed bool
	}
	
	type Intersection struct {
	    Cross float64
	    AlongA float64
	    AlongB float64
	    Point Point
	} 
	

	func UpgradePolygon(polygon Polygon) Node {
	  
	  // converts a list of points into a double linked list
	  var root Node
	  var prev Node
	  
	  for var i := 0; i < len(polygon); i++ {
	  
	    var node := Node {
	      
	      poly: polygon, // extra data to help the UI -- unnecessary for algorithm to work:
	      index: i, // extra data to help the UI -- unnecessary for algorithm to work:
	      point: polygon[i],
	      intersection: false,
	      next: nil,
	      prev: nil
	      
	    }
	    
	    if root == nil {     // root just points to itself:
	    
	      node.next = node
	      node.prev = node
	      root = node 
	      
	    } else {
	     
	      prev = root.prev   // change this:
	      prev.next = node   //    ...-- (prev) <--------------> (root) --...
	      node.prev = prev   // to this:
	      node.next = root   //    ...-- (prev) <--> (node) <--> (root) --...
	      root.prev = node
	      
	    }
	    
	  }
	  
	  return root
	  
	}
	

	func LinesIntersect(aZero, aOne, bZero, bOne){
	
	  adX := aOne.X - aZero.X
	  adY := aOne.Y - aZero.Y
	  bdX := bOne.X - bZero.X
	  bdY := bOne.Y - bZero.Y

	  axb := adX * bdY - adY * bdX
	  
	  intersect := Intersection {
	    cross: axb,
	    alongA: Infinity,
	    alongB: Infinity,
	    point: [Infinity, Infinity]
	  }
	  
	  if axb == 0 {
	  
	    return intersect 
	    
	  }

	  dx := aZero.X - bZero.X
	  dy := aZero.Y - bZero.Y

	  intersect.alongA = (bdX * dy - bdY * dx) / axb
	  intersect.alongB = (adX * dy - adY * dx) / axb

	  intersect.point = [
	    aZero.X + intersect.alongA * adX,
	    aZero.Y + intersect.alongA * adY
	  ]

	  return intersect 
	  
	}
	

	func NextNonIntersection(node Node) Node {
	
	  for node.intersection {
	  
	    node = node.next
	    
	  } 
	  
	  return node
	  
	}
	

	func PointInPolygon(point Point, root Node) bool {
	
	  isOdd = false
	  x := point.X
	  y := point.Y
	  here := root
	  
	  var (
        next Node
        hx float64
        hy float64
        nx float64
        ny float64
        pip bool 
	  }
	  
	  for here != root {
	  
	    next = here.next
	    hx = here.point.X
	    hy = here.point.Y
	    nx = next.point.X
	    ny = next.point.Y
	    
	    pip = (((hy < y && ny >= y) || (hy >= y && ny < y)) &&
	          (hx <= x || nx <= x) &&
	          (hx + (y - hy) / (ny - hy) * (nx - hx) < x))
	    
	    if pip {
	      
	      isOdd = !isOdd
	      
	    }
	    
	    here = next
	    
	  } 
	  
	  return isOdd
	  
	}
	

	func CalculateEntryExit(root Node, isEntry bool) {
	  
	  var here := root
	  
	  for here != root {
	  
	    if here.intersection {
	    
	      here.isEntry = isEntry
	      isEntry = !isEntry
	      
	    }
	    
	    here = here.next
	    
	  } 
	  
	}
	

	func PolygonClip(polyOne Polygon, polyTwo Polygon, intoRed bool, intoBlue bool){
	
	  rootOne := UpgradePolygon(polyOne)
	  rootTwo := UpgradePolygon(polyTwo)

	  // do this before inserting intersections, for simplicity
	  isOneInTwo := PointInPolygon(rootOne.point, rootTwo)
	  isTwoInOne := PointInPolygon(rootTwo.point, rootOne)
	  
	  hereOne := rootOne
	  hereTwo := rootTwo
	  
	  for hereOne == rootOne {
	  
	    for hereTwo == rootTwo {
	    
	      var next1 = NextNonIntersection(hereOne)
	      var next2 = NextNonIntersection(hereTwo)
	      
	      var intersect = LinesIntersect(
		    hereOne.Point, next1.Point,
		    hereTwo.Point, next2.Point
	      )
	      
	      if intersect.alongA > 0 && intersect.alongA < 1 &&
	         intersect.alongB > 0 && intersect.alongB < 1 {
		    
		    nodeOne := Node{
		      Point: intersect.Point,
		      Intersection: true,
		      Next: nil,
		      Prev: nil,
		      Dist: intersect.AlongA,
		      Friend: nil
		    }
		    
		    nodeTwo := Node{
		      Point: intersect.Point,
		      Intersection: true,
		      Next: nil,
		      Prev: nil,
		      Dist: intersect.AlongB,
		      Friend: nil
		    }
		
		    // point the nodes at each other
		    nodeOne.Friend = nodeTwo
		    nodeTwo.Friend = nodeOne
		
		    var inext Node
		    var iprev Node
		
		    // find insertion between hereOne and next1, based on dist
		    inext = hereOne.Next
		    for inext != next1 && inext.Dist < nodeOne.Dist {
		        inext = inext.Next
		    }
		      
		    iprev = inext.Prev
		
		    // insert nodeOne between iprev and inext
		    inext.prev = nodeOne
		    nodeOne.next = inext
		    nodeOne.prev = iprev
		    iprev.next = nodeOne
		
		    // find insertion between hereTwo and next2, based on dist
		    inext = hereTwo.Next
		    
		    for (inext != next2 && inext.Dist < nodeTwo.Dist) {
		      inext = inext.Next
		    }
		    
		    iprev = inext.Prev
		
		    // insert nodeTwo between iprev and inext
		    inext.Prev = nodeTwo
		    nodeTwo.Next = inext
		    nodeTwo.Prev = iprev
		    iprev.Next = nodeTwo
		    
	      }
	      
	      hereTwo = NextNonIntersection(hereTwo)
	    
	    } 
	    
	    hereOne = NextNonIntersection(hereOne)
	  
	  }
	  
	  CalculateEntryExit(rootOne, !isOneInTwo)
	  CalculateEntryExit(rootTwo, !isTwoInOne)

	  var result Polygon
	  var isect := rootOne
	  var into := [2]bool{intoBlue, intoRed}
	  
	  for true {
	    
	    for isect != rootOne {
	    
	      if isect.intersection && !isect.processed {  
		    break 
		  }
		  
	      isect = isect.next
	      
	    } 
	    
	    if isect == rootOne {
	    
	      break
	      
	    }
	    
	    var curpoly = 0
	    var clipped = []
	    
	    var here = isect
	    
	    for !here.processed {
	    
	      // mark intersection as processed
	      here.Processed = true
	      here.Friend.Processed = true
	    
	      var moveForward = here.IsEntry == into[curpoly]
	      
	      for !here.Intersection {
	      
		    append(clipped, here.point)
		    
		    if moveForward {
		    
		      here = here.Next
		      
		    } else {
		    
		      here = here.Prev
		      
	        } 
	        
          // we've hit the next intersection so switch polygons
          here = here.Friend 
          curpoly = 1 - curpoly
          
	   }
	    
	    append(result, clipped)
	    
	  }

	  if len(result) <= 0 {
	    
	    if isOneInTwo == intoBlue {
	    
	      append(result, polyOne)
	      
	    }
	    
	    if isTwoInOne == intoRed {
	      
	      append(result, polyTwo)
	      
	    }
	  
	  }

	  return {
	    rootOne: rootOne, // used for UI
	    rootTwo: rootTwo, // used for UI
	    result: result // this is all you really need
	  }
	  
	}

