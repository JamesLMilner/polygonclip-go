
//
// ----- Greiner-Hormann clipping algorithm -----
//

function UpgradePolygon(p){
  // converts a list of points into a double linked list
  var root = null;
  for (var i = 0; i < p.length; i++){
    var node = {
      // extra data to help the UI -- unnecessary for algorithm to work:
      poly: p,
      idx: i,
      // --

      point: p[i],
      intersection: false,
      next: null,
      prev: null
    };
    if (root === null){
      // root just points to itself:
      //    +-> (root) <-+
      //    |            |
      //    +------------+
      node.next = node;
      node.prev = node;
      root = node;
    }
    else{
      // change this:
      //    ...-- (prev) <--------------> (root) --...
      // to this:
      //    ...-- (prev) <--> (node) <--> (root) --...
      var prev = root.prev;
      prev.next = node;
      node.prev = prev;
      node.next = root;
      root.prev = node;
    }
  }
  return root;
}

function LinesIntersect(a0, a1, b0, b1){
  var adx = a1[0] - a0[0];
  var ady = a1[1] - a0[1];
  var bdx = b1[0] - b0[0];
  var bdy = b1[1] - b0[1];

  var axb = adx * bdy - ady * bdx;
  var ret = {
    cross: axb,
    alongA: Infinity,
    alongB: Infinity,
    point: [Infinity, Infinity]
  };
  if (axb === 0)
    return ret;

  var dx = a0[0] - b0[0];
  var dy = a0[1] - b0[1];

  ret.alongA = (bdx * dy - bdy * dx) / axb;
  ret.alongB = (adx * dy - ady * dx) / axb;

  ret.point = [
    a0[0] + ret.alongA * adx,
    a0[1] + ret.alongA * ady
  ];

  return ret;
}

function NextNonIntersection(node){
  do{
    node = node.next;
  } while (node.intersection);
  return node;
}

function PointInPolygon(point, root){
  var odd = false;
  var x = point[0];
  var y = point[1];
  var here = root;
  do {
    var next = here.next;
    var hx = here.point[0];
    var hy = here.point[1];
    var nx = next.point[0];
    var ny = next.point[1];
    if (((hy < y && ny >= y) || (hy >= y && ny < y)) &&
      (hx <= x || nx <= x) &&
      (hx + (y - hy) / (ny - hy) * (nx - hx) < x)){
      odd = !odd;
    }
    here = next;
  } while (here !== root);
  return odd;
}

function CalculateEntryExit(root, isEntry){
  var here = root;
  do{
    if (here.intersection){
      here.isEntry = isEntry;
      isEntry = !isEntry;
    }
    here = here.next;
  } while (here !== root);
}

function PolygonClip(poly1, poly2, intoRed, intoBlue){
  var root1 = UpgradePolygon(poly1);
  var root2 = UpgradePolygon(poly2);

  // do this before inserting intersections, for simplicity
  var is1in2 = PointInPolygon(root1.point, root2);
  var is2in1 = PointInPolygon(root2.point, root1);
  
  var here1 = root1;
  var here2 = root2;
  do{
    do{
      var next1 = NextNonIntersection(here1);
      var next2 = NextNonIntersection(here2);
      
      var i = LinesIntersect(
        here1.point, next1.point,
        here2.point, next2.point
      );
      
      if (i.alongA > 0 && i.alongA < 1 &&
        i.alongB > 0 && i.alongB < 1){
        var node1 = {
          point: i.point,
          intersection: true,
          next: null,
          prev: null,
          dist: i.alongA,
          friend: null
        };
        var node2 = {
          point: i.point,
          intersection: true,
          next: null,
          prev: null,
          dist: i.alongB,
          friend: null
        };
        
        // point the nodes at each other
        node1.friend = node2;
        node2.friend = node1;
        
        var inext, iprev;
        
        // find insertion between here1 and next1, based on dist
        inext = here1.next;
        while (inext !== next1 && inext.dist < node1.dist)
          inext = inext.next;
        iprev = inext.prev;
        
        // insert node1 between iprev and inext
        inext.prev = node1;
        node1.next = inext;
        node1.prev = iprev;
        iprev.next = node1;
        
        // find insertion between here2 and next2, based on dist
        inext = here2.next;
        while (inext !== next2 && inext.dist < node2.dist)
          inext = inext.next;
        iprev = inext.prev;
        
        // insert node2 between iprev and inext
        inext.prev = node2;
        node2.next = inext;
        node2.prev = iprev;
        iprev.next = node2;
      }
      here2 = NextNonIntersection(here2);
    } while (here2 !== root2);
    here1 = NextNonIntersection(here1);
  } while (here1 !== root1);
  
  CalculateEntryExit(root1, !is1in2);
  CalculateEntryExit(root2, !is2in1);

  var result = [];
  var isect = root1;
  var into = [intoBlue, intoRed];
  while (true){
    do{
      if (isect.intersection && !isect.processed)
        break;
      isect = isect.next;
    } while (isect !== root1);
    if (isect === root1)
      break;
  
    var curpoly = 0;
    var clipped = [];
    
    var here = isect;
    do{
      // mark intersection as processed
      here.processed = true;
      here.friend.processed = true;
    
      var moveForward = here.isEntry === into[curpoly];
      do{
        clipped.push(here.point);
        if (moveForward)
          here = here.next;
        else
          here = here.prev;
      } while (!here.intersection);
    
      // we've hit the next intersection so switch polygons
      here = here.friend;
      curpoly = 1 - curpoly;
    } while (!here.processed);
    
    result.push(clipped);
  }

  if (result.length <= 0){
    if (is1in2 === intoBlue)
      result.push(poly1);
    if (is2in1 === intoRed)
      result.push(poly2);
  }

  return {
    root1: root1, // used for UI
    root2: root2, // used for UI
    result: result // this is all you really need
  };
}

//
// ----- user interface code below -----
//

var rscale = 2;
var poly1 = [
  [ 181, 270 ],
  [  85, 418 ],
  [ 171, 477 ],
  [ 491, 365 ],
  [ 218, 381 ],
  [ 458, 260 ]
];
var poly2 = [
  [ 474, 488 ],
  [ 659, 363 ],
  [ 255, 283 ],
  [  56, 340 ],
  [ 284, 488 ],
  [ 371, 342 ]
];
var nodeHover = false;
var modeTxt = 'Intersect';
var mode = [true, true];

var cnv, ctx;

function setMode(txt, fwdA, fwdB){
  modeTxt = txt;
  mode = [fwdA, fwdB];
  redraw();
}

function colComp(n){
  n = Math.floor(n * 256);
  if (n > 255)
    return 255;
  if (n < 0)
    return 0;
  return n;
}

function colToHex(color){
  function hex(n){
    n = colComp(n).toString(16);
    return (n.length <= 1 ? '0' : '') + n;
  }
  return '#' + hex(color[0]) + hex(color[1]) + hex(color[2]);
}

function colMul(c, s){
  return [c[0] * s, c[1] * s, c[2] * s];
}

function hovering(here){
  return nodeHover !== false && nodeHover.poly === here.poly && nodeHover.idx === here.idx;
}

function fillPoly(root, color){
  ctx.beginPath();
  var here = root;
  do{
    ctx.lineTo(here.point[0], here.point[1]);
    here = here.next;
  } while (here !== root);
  ctx.lineTo(root.point[0], root.point[1]);

  ctx.fillStyle = 'rgba(' +
    colComp(color[0]) + ', ' +
    colComp(color[1]) + ', ' +
    colComp(color[2]) + ', ' +
    '0.2)';
  ctx.fill('evenodd');
}

function tracePoly(root, color){
  color = colToHex(color);
  ctx.beginPath();
  ctx.moveTo(root.prev.point[0], root.prev.point[1]);
  var arrowLen = 5 * rscale;
  var arrowAng = 0.45;
  var here = root;
  do{
    var x = here.point[0];
    var y = here.point[1];

    ctx.lineTo(x, y);

    var ang = Math.atan2(here.prev.point[1] - y, here.prev.point[0] - x);
    var pt_rad = here.intersection ? 4 : (hovering(here) ? 6 : 3);
    var ax = x + Math.cos(ang) * pt_rad * rscale;
    var ay = y + Math.sin(ang) * pt_rad * rscale;
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax + Math.cos(ang + arrowAng) * arrowLen,
      ay + Math.sin(ang + arrowAng) * arrowLen
    );
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax + Math.cos(ang - arrowAng) * arrowLen,
      ay + Math.sin(ang - arrowAng) * arrowLen
    );
    ctx.moveTo(x, y);

    here = here.next;
  } while (here !== root);

  ctx.lineWidth = rscale;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function tracePolyPoints(root, color, leftIsect){
  color = colToHex(color);
  var here = root;
  do{
    if (here.intersection){
      ctx.beginPath();
      if (leftIsect)
        ctx.arc(here.point[0], here.point[1], 4 * rscale, Math.PI * 0.5, Math.PI * 1.5);
      else
        ctx.arc(here.point[0], here.point[1], 4 * rscale, Math.PI * 1.5, Math.PI * 0.5);
      ctx.fillStyle = here.isEntry ? '#fff' : '#000';
      ctx.fill();
      ctx.strokeStyle = here.isEntry ? '#000' : '#777';
      ctx.stroke();
    }
    else{
      var rad = 3;
      if (hovering(here))
        rad = 6;
      ctx.beginPath();
      ctx.arc(here.point[0], here.point[1], rad * rscale, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    here = here.next;
  } while (here !== root);
}

function closestPoint(p, x, y){
	var idx = false;
	var len2 = false;
	for (var i = 0; i < p.length; i++){
		var dx = p[i][0] - x;
		var dy = p[i][1] - y;
		var thisLen2 = dx * dx + dy * dy;
		if (len2 === false || thisLen2 < len2){
			idx = i;
			len2 = thisLen2;
		}
	}
	return {
		poly: p,
		idx: idx,
		len: Math.sqrt(len2)
	};
}

function redraw(){
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, cnv.width / 2, cnv.height / 2);

  var res = PolygonClip(poly1, poly2, mode[0], mode[1]);
  //res = { root1: UpgradePolygon(poly1), root2: UpgradePolygon(poly2), result: [] };

  fillPoly(res.root1, [1, 0, 0]);
  fillPoly(res.root2, [0, 0, 1]);
  tracePoly(res.root1, [1, 0, 0]);
  tracePoly(res.root2, [0, 0, 1]);
  tracePolyPoints(res.root1, [1, 0, 0], true);
  tracePolyPoints(res.root2, [0, 0, 1], false);

  //
  // draw result
  //
  var opres = res.result;
  ctx.beginPath();
  for (var i = 0; i < opres.length; i++){
    var opp = opres[i];
    ctx.moveTo(opp[opp.length - 1][0], opp[opp.length - 1][1] - cnv.height / 4);
    for (var j = 0; j < opp.length; j++)
      ctx.lineTo(opp[j][0], opp[j][1] - cnv.height / 4);
  }
  ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
  ctx.fill('evenodd');

  ctx.beginPath();
  var arrowLen = 5 * rscale;
  var arrowAng = 0.45;
  for (var i = 0; i < opres.length; i++){
    var opp = opres[i];
    var prev = opp[opp.length - 1];
    ctx.moveTo(prev[0], prev[1] - cnv.height / 4);
    for (var j = 0; j < opp.length; j++){
      var ang = Math.atan2(prev[1] - opp[j][1], prev[0] - opp[j][0]);
      var ax = opp[j][0] + Math.cos(ang) * 1.5 * rscale;
      var ay = opp[j][1] + Math.sin(ang) * 1.5 * rscale;
      ctx.lineTo(opp[j][0], opp[j][1] - cnv.height / 4);
      ctx.moveTo(ax, ay - cnv.height / 4);
      ctx.lineTo(
        ax + Math.cos(ang + arrowAng) * arrowLen,
        ay + Math.sin(ang + arrowAng) * arrowLen - cnv.height / 4
      );
      ctx.moveTo(ax, ay - cnv.height / 4);
      ctx.lineTo(
        ax + Math.cos(ang - arrowAng) * arrowLen,
        ay + Math.sin(ang - arrowAng) * arrowLen - cnv.height / 4
      );
      ctx.moveTo(opp[j][0], opp[j][1] - cnv.height / 4);
      prev = opp[j];
    }
  }
  ctx.strokeStyle = '#070';
  ctx.stroke();

  for (var i = 0; i < opres.length; i++){
    var opp = opres[i];
    for (var j = 0; j < opp.length; j++){
      ctx.beginPath();
      ctx.arc(opp[j][0], opp[j][1] - cnv.height / 4, 1.5 * rscale, 0, Math.PI * 2);
      ctx.fillStyle = '#070';
      ctx.fill();
    }
  }

  ctx.save();
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillText(modeTxt, 0, cnv.height / 4 + 13);
  ctx.restore();

  ctx.beginPath();
  for (var x = 0; x < cnv.width / 2; x += 10){
    ctx.moveTo(x, cnv.height / 4);
    ctx.lineTo(x + 5, cnv.height / 4);
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.stroke(); // */
}

function mouseTrackHover(mx, my){
	// look for the closest node
	var p1 = closestPoint(poly1, mx, my);
	var p2 = closestPoint(poly2, mx, my);
	if (p1.len === false || (p2.len !== false && p2.len < p1.len))
		p1 = p2;
	if (p1.len === false || p1.len > 10){
		if (nodeHover !== false){
			nodeHover = false;
			redraw();
		}
		return;
	}
	if (nodeHover === false || nodeHover.poly !== p1.poly || nodeHover.idx !== p1.idx){
		nodeHover = p1;
		redraw();
	}
}

function init(){
	cnv = document.getElementById('cnv');
	ctx = cnv.getContext('2d');
	// make y go up and scale by 2 (for high DPI screens)
	ctx.transform(2, 0, 0, -2, 0, cnv.height);

	var dragging = false;

	function mousePos(e){
		var rect = cnv.getBoundingClientRect();
		return [
			e.clientX - rect.left,
			cnv.height / 2 - e.clientY + rect.top
		];
	}

	cnv.addEventListener('mousemove', function(e){
		var mp = mousePos(e);
		if (dragging){
			var dx = mp[0] - dragging[0];
			var dy = mp[1] - dragging[1];
      var pt = nodeHover.poly[nodeHover.idx];
      if (pt[1] + dy < cnv.height / 4)
        dy = cnv.height / 4 - pt[1];
			dragging = [dragging[0] + dx, dragging[1] + dy];
			pt[0] += dx;
			pt[1] += dy;
			redraw();
		}
		else
			mouseTrackHover(mp[0], mp[1]);
	});

	cnv.addEventListener('mouseup', function(e){
		var mp = mousePos(e);
		if (dragging){
			dragging = false;
			mouseTrackHover(mp[0], mp[1]);
			redraw();
		}
		else
			mouseTrackHover(mp[0], mp[1]);
	});

	cnv.addEventListener('mouseleave', function(e){
		if (dragging){
			dragging = false;
			nodeHover = false;
			redraw();
		}
	});

	cnv.addEventListener('mousedown', function(e){
		var mp = mousePos(e);
		mouseTrackHover(mp[0], mp[1]);
		if (nodeHover !== false){
			dragging = mp; // begin dragging
			e.preventDefault();
		}
	});
	redraw();
}
  
