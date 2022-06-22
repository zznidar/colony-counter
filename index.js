class Petrijevka {
    constructor(Sx=undefined, Sy=undefined, r=undefined, bgColour=undefined, colonyColour=undefined) {
        this.centre = [Sx, Sy];
        this.radius = r;
        this.bg = bgColour;
        this.cc = colonyColour;
    }
}

var petrijevka = new Petrijevka();;
var slikaWidth, slikaHeight;
negative = false // If we want to analyse dark bacteria on light agar (e. g. HA in contrast to KA)
function analyse(slika, init=true, resize=true, negate=false) {
    negative = negate;
    colonies = 0;
    console.log(slika.width, slika.height);
    sirina = slikaWidth = slika.width
    visina = slikaHeight = slika.height

    if(init) {
        document.getElementById("slider_Sx").value = 0.5*(document.getElementById("slider_Sx").max = sirina);
        document.getElementById("slider_Sy").value = 0.5*(document.getElementById("slider_Sy").max = visina);
        document.getElementById("slider_r").value = 0.5*(document.getElementById("slider_r").max = Math.round(Math.max(sirina, visina)/2));
    }
    
    // Resize image if greater than 2000x2000 px
    if((sirina > 2000 || visina > 2000) && resize) {
        console.log("resizing", sirina, visina, "divide by 2");
        sirina = Math.floor(sirina/2);
        visina = Math.floor(visina/2);
        r = Math.floor(r/2);
        S[0] = Math.floor(S[0]/2);
        S[1] = Math.floor(S[1]/2);
    }

    canvas.width = sirina
    canvas.height = visina


    context.drawImage(base_image, 0, 0, sirina, visina);

    a = Array(sirina) // prava orientacija
    for(let i = 0; i < sirina; i++) {
        a[i] = Array(visina);
    }

    b = Array(visina) // obrnjena za 90
    for(let i = 0; i < visina; i++) {
        b[i] = Array(sirina);
    }

    // Only read from canvas once as it is very CPU/GPU-demanding
    imgdata = context.getImageData(0, 0, sirina, visina); // TODO: Split canvas evenly among threads
    arr_shallow = imgdata.data;
    arr = Uint8ClampedArray.from(arr_shallow) // This shall not be modified to allow multiple-pass processing.

    
    let barve_temp_var_name = detectColour(sirina>>>1, visina>>>1, 100, 100, 4) // area must have area if we want to detect multiple colour groups. // Also, bitshift instead of /2 to prevent floats
    console.log(barve_temp_var_name);
    logColours(barve_temp_var_name);
    context.putImageData(imgdata, 0, 0);
    
    //bgColour = barve_temp_var_name[2];
    //ccColour = barve_temp_var_name[3];
    
    bgColour = barve_temp_var_name[0];
    ccColour = barve_temp_var_name[1];
    // Better would be to compare number of elements of each colour,
    // then take the most common colour as the bg and 2nd most common as the cc.
    detectPetriDish(bgColour);
    
    
    count();
}

 L_threshold = 0.4;
 size_threshold = 10;
const line_colour = [0, 0, 0, 255];
const centre_colour = [3, 219, 252, 255]

function istHell(rgba) {
    // Convert RGB to HSL: https://www.rapidtables.com/convert/color/rgb-to-hsl.html
    let [r, g, b, a] = rgba;
    let Cmax = Math.max(r, g, b)/255;
    let Cmin = Math.min(r, g, b)/255;

    let L = (Cmax + Cmin)/2;

    return((L > L_threshold) != negative);
}

function logColours(barve_temp_var_name) {
    for(let i of barve_temp_var_name) {
        console.log(`%c${i}`, `background-color: rgb(${i[0]}, ${i[1]}, ${i[2]}); font-weight: bold;`);
    }
}

function setPixels(x, y, r, g, b, a) {
    //return;
    arr_shallow[0 + 4*x + 4*sirina*y] = r;
    arr_shallow[1 + 4*x + 4*sirina*y] = g;
    arr_shallow[2 + 4*x + 4*sirina*y] = b;
    arr_shallow[3 + 4*x + 4*sirina*y] = a;

}

// circle
S = [500, 500];
r = 250;
function isInCircle(x, y) {
    return(distance([x, y], S) < r-3)
}

function distance(T1, T2) {
    return(Math.hypot(T2[0]-T1[0], T2[1]-T1[1]))
}


// context.getImageData(x, y, sirina, visina).data // sirina = visina = 1, ce hocemo 1 pixel


/* Vzamemo povprecje npr. from area 100 x 100 px okrog sredisca slike
    supposing, da je tam sigurno petrijevka,
    in to nastavimo za agar colour.

    Sprehajamo se od levega roba proti sredini (in enako z desnega) po 5 pixlov, povprecimo,
    zaznamo robno obmocje.
    Nato robnih 5 pixlov krajsamo za 1 po 1 pixel, dokler ne pridemo do dejanskega roba.
*/

function isColourColony(yourColour) {
    return((colourDistance(yourColour, petrijevka.cc) < colourDistance(yourColour, petrijevka.bg)) != negative);
}

function colourDistance(yourColour, targetColour, absolute=true) {
    let [r, g, b, a] = yourColour;
    let [rt, gt, bt, at] = targetColour;

    if(absolute) {
        return(Math.abs(r-rt) + Math.abs(g-gt) + Math.abs(b-bt) + Math.abs(a-at))
    } else {
        return((r-rt) + (g-gt) + (b-bt) + (a-at))
    }

}

function getAverageColour(x, y, width, height) {
    let sum = [0, 0, 0, 0];
    let count = 0;
    for(let i = x; i < x + width; i++) {
        for(let j = y; j < y + height; j++) {
            let [r, g, b, a] = arr.slice(0 + 4*i + 4*sirina*j, 4 + 4*i + 4*sirina*j);
            sum[0] += r;
            sum[1] += g;
            sum[2] += b;
            sum[3] += a;
            count++;
        }
    }
    return(sum.map(x => Math.round(x/count)))
}

function detectColour(x, y, width, height, nGroups=2) {
    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);
    console.log("Detecting: ", x, y, width, height, nGroups);
    
    // fn above does a surprisingly good job of detecting colours, but it's not perfect.
    // This function is a bit more accurate, but it's still not perfect.
    // Thanks, GitHub Copilot, for these two comments. And for the getAverageColour function :D

    /* Vzamemo prvi pixel, damo barvo v 1. skupino. Vzamemo drugi pixel, damo v 2. skupino.
        Naslednji pixel: v skupino, ki je bližje. To skupino zdaj povprečimo (utežno, glede na število elementov),
        npr: v 1. skupini so že 4 pixli (barva je njihov povpreček), dodati hočemo še enega. Staro povprečje * 4/5 + novo povprečje * 1/5
    */

    console.groupCollapsed("colourDetect");
    //let groups = [[127,127,127,255, 1], [127,127,127,255, 1]];
    //let groups = [];
    let groups = [[255,255,255,255, 1], [0,0,0,255, 1]]; // Having a white and black group (where nGroups = 4) could help remove flomaster & odsev luči
    //TODO: Do not use pre-defined groups. Instead, create a new group (as long as there are fewer than nGroups groups) only when colour distance is large enough (greater than 20, idk)
    
    let ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "yellow";
    ctx.stroke();

    for(let i = x; i < x + width; i++) {
        for(let j = y; j < y + height; j++) {
            if(j < (y+2) || j > (y + width-2) || i < (x+2) || i > (x + height-2)) setPixels(i, j, 255, 255, 0, 255);
            let [r, g, b, a] = arr.slice(0 + 4*i + 4*sirina*j, 4 + 4*i + 4*sirina*j);
            if(!groups.length) {
                groups.push([r, g, b, a, 1]);
                continue;
            }

            let closestGroupIndex;
            let closestGroupDistance;
            for(let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                let dist = Math.abs(colourDistance([r, g, b, a], groups[groupIndex].slice(0,-1), true));
      //r                      if(i < x + width/10) console.log([r, g, b, a], groups[groupIndex].slice(0, -1), dist, closestGroupDistance);
                if(closestGroupIndex === undefined || dist < closestGroupDistance) {
                    //console.log("Is smaller");
                    closestGroupDistance = dist;
                    closestGroupIndex = groupIndex;
                }
            }
       //                 if(i < x + width/10) console.log(closestGroupDistance, closestGroupIndex, JSON.stringify(groups));
            if(closestGroupDistance > 20 && groups.length < nGroups) {
                groups.push([r, g, b, a, 1]);
                continue;
            }
            // Closest group was found. Now add it to it.
            newCount = groups[closestGroupIndex][4]+1
            groups[closestGroupIndex][0] = (groups[closestGroupIndex][0] * (newCount-1)/newCount) + (r * 1/newCount);
            groups[closestGroupIndex][1] = (groups[closestGroupIndex][1] * (newCount-1)/newCount) + (g * 1/newCount);
            groups[closestGroupIndex][2] = (groups[closestGroupIndex][2] * (newCount-1)/newCount) + (b * 1/newCount);
            groups[closestGroupIndex][3] = (groups[closestGroupIndex][3] * (newCount-1)/newCount) + (a * 1/newCount);
            groups[closestGroupIndex][4] = newCount;
        }
    }
    console.groupEnd("colourDetect");
    console.log("%c Colour of colonies on agar-coloured background", `color: rgb(${groups[0].slice(0,3)}); background-color: rgb(${groups[1].slice(0,3)})`);
    groups = groups.map(x => x.map(y => Math.round(y)));
    groups.sort((a,b) => b[4]-a[4])
    document.getElementById("outputText").insertAdjacentHTML("beforeend", `<br>Colour of colonies on agar-coloured background: <span style="color: rgb(${groups[1].slice(0,3)}); background-color: rgb(${groups[0].slice(0,3)}); font-weight: bold;">${groups[1].slice(0,3)}</span>`);
    return(groups)

    // If there's very few colonies, we don't get their colour. 
    // Create a new group only when there's a difference of more than some threshold?
}


function detectPetriDish(agarColour, repeat=0, xc=sirina>>>1, yc=visina>>>1) {
    const edgeColours = ["blue", "green", "pink", "purple", "yellow", "white", "black"];
    let x0, x1, y0, y1;
    //let pet = 5;
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = edgeColours[repeat];
    // Sprehodimo se od roba proti sredini, iščoč 5-average agarja.
    for(let x = 0, pet = 5; x < sirina>>>1; x += pet) {
        let barvus = getAverageColour(x, yc, pet, 1);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(x, barvus, colourDistance(barvus, agarColour));
            ctx.fillRect(x, yc, 4*pet, 4*pet)
            x0 = x;

            if(pet == 1) break;

            // Now find exact (1 px) border
            pet = 1;
            x -= 5;
            ctx.fillStyle = "orange";
        }
    }
    
    ctx.fillStyle = edgeColours[repeat];
    for(let x = sirina, pet = 5; x > sirina>>>1; x -= pet) {
        let barvus = getAverageColour(x, yc, pet, 1);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(x, barvus, colourDistance(barvus, agarColour));
            ctx.fillRect(x, yc, 4*pet, 4*pet)
            x1 = x;

            if(pet == 1) break;

            // Now find exact (1 px) border
            pet = 1;
            x += 5;
            ctx.fillStyle = "orange";
        }
    }

    ctx.fillStyle = edgeColours[repeat];
    for(let y = 0, pet = 5; y < visina>>>1; y += pet) {
        let barvus = getAverageColour(xc, y, 1, pet);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(y, barvus, colourDistance(barvus, agarColour));
            ctx.fillRect(xc, y, 4*pet, 4*pet)
            y0 = y;

            if(pet == 1) break;

            // Now find exact (1 px) border
            pet = 1;
            y -= 5;
            ctx.fillStyle = "orange";
        }
    }
    
    ctx.fillStyle = edgeColours[repeat];
    for(let y = visina, pet = 5; y > visina>>>1; y -= pet) {
        let barvus = getAverageColour(xc, y, 1, pet);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(y, barvus, colourDistance(barvus, agarColour));
            ctx.fillRect(xc, y, 4*pet, 4*pet);
            y1 = y;

            if(pet == 1) break;

            // Now find exact (1 px) border
            pet = 1;
            y += 5;
            ctx.fillStyle = "orange";

        }
    }

    // First centre expectation. At those x and y, run detection again (should get the diametres of the circle)
    xc = (x0 + x1) >>> 1;
    yc = (y0 + y1) >>> 1;
    radius_temp = (x1 - x0 + y1 - y0)>>>2; // average radius, based on both axes

    console.log("repeat", repeat, xc, yc);

    if(xc && yc && radius_temp) {
        // xc ... vertical centre point
        // yc ... horizontal centre point
        centre = [xc, yc];
        radius = radius_temp;
        console.log("Centre", ...centre, "radius", radius);
        
        ctx.beginPath();
        ctx.arc(...centre, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 5;
        ctx.strokeStyle = edgeColours[repeat];
        ctx.stroke(); 
        ctx.fillStyle = edgeColours[repeat];
        ctx.fillRect(...centre, 12, 12);
        
        if(repeat < 6) {
            console.log("Repeating.")
            detectPetriDish(agarColour, ++repeat, xc, yc);
            return("repeating");
        }
    }
    
    console.log("Krožnica: ", ...centre, radius);
    petrijevka.centre = centre;
    petrijevka.radius = radius;
    
    // Krožnica je zdaj natanko določena. Analiziramo samo znotraj nje.

    // Let's try to detect colours again, this time in the inner square of the circle.
    let barve_temp_var_name = detectColour(centre[0]-(radius/Math.sqrt(2)), centre[1]-(radius/Math.sqrt(2)), 2*radius/Math.sqrt(2), 2*radius/Math.sqrt(2), 4); 
    //let tmp = barve_temp_var_name.sort((a,b) => b[4]-a[4]);
    //barve_temp_var_name = tmp;
    console.log("Reanalysing colours: ", barve_temp_var_name);
    logColours(barve_temp_var_name);

    // Detect petri dish again, this time with barve_temp_var_name[0] as agar colour

    petrijevka.bg = barve_temp_var_name[0].slice(0, -1);
    petrijevka.cc = barve_temp_var_name[1].slice(0, -1);

    S = petrijevka.centre;
    r = petrijevka.radius;



            

    // TODO: Draw a graph of distance (or better, ratio of distances) to set the threshold. Probably when there's a big enough change && colour is close enough.

    // Also, maybe if pixel is close enough to black/white, skip it when calculating avg distance (it's probably flomaster) // Maybe that's not even needed -- flomaster is more than 5 px away from agar edge :shrug:

    // REFRACTOR: Zakaj imam 4x isto kodo napisano? :face_palm:
    // Načeloma bi lahko hodil iz obeh smeri hkrati.
}


function count() {
        // arr = [r00, g00, b00, a00, r10, g10, b10, a10] // Apparently bomo analizirali po vrsticah najprej.
    // r_xy = 0 + 4*x + 4*sirina*y

    context = canvas.getContext('2d');
    imgdata = context.getImageData(0, 0, sirina, visina); // TODO: Split canvas evenly among threads
    arr_shallow = imgdata.data;



    const x_start = Math.max(S[0]-r, 0),
    y_start = Math.max(S[1]-r, 0),
    x_end = Math.min(S[0]+r, sirina),
    y_end = Math.min(S[1]+r, visina);
    for(let x = x_start; x < x_end; x++) { // 0; sirina
        let colonyStart, colonyEnd;
        for(let y = y_start; y < y_end; y++) { // 0; visina
            //x, y
            if(!isInCircle(x, y)) continue;
            if(isColourColony(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
                //console.log(x, y, "ist hell");
                colonyStart = y;
                y++;
                while(y < visina && isColourColony(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
                    setPixels(x, y, 255, 0, 0, 255);
                    y++;
                }
                //console.log(x, y, "is not anymore hell.");
                // pixel ni vec svetel
                colonyEnd = y
                sredina = Math.floor((colonyStart + colonyEnd)/2)
                velikost = colonyEnd - colonyStart;
                a[x][sredina] = a[x][sredina+1] = velikost;
                setPixels(x, sredina, ...line_colour);
                setPixels(x, sredina+1, ...line_colour);
            }
        }
    }

    for(let y = y_start; y < y_end; y++) { // 0; sirina
        let colonyStart, colonyEnd;
        for(let x = x_start; x < x_end; x++) { // 0; visina
            //x, y
            if(!isInCircle(x, y)) continue;
            if(isColourColony(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
                //console.log(x, y, "ist hell");
                colonyStart = x;
                x++;
                while(x < sirina && isColourColony(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
                    //setPixels(x, y, 255, 0, 0, 255);
                    x++;
                }
                //console.log(x, y, "is not anymore hell.");
                // pixel ni vec svetel
                colonyEnd = x
                sredina = Math.floor((colonyStart + colonyEnd)/2)
                velikost = colonyEnd - colonyStart;
                b[y][sredina] = b[y][sredina+1] = velikost;
                setPixels(sredina, y, ...line_colour);
                setPixels(sredina+1, y, ...line_colour);

                if(a[sredina][y] > size_threshold && b[y][sredina] > size_threshold) {
                    for(let i = -3; i < 5; i++) {
                        for(let j = -3; j < 5; j++) {
                            setPixels(sredina + i, y + j, ...centre_colour); // ...centre_colour // ...[Math.round(Math.random()*255), Math.round(Math.random()*255), Math.round(Math.random()*255), 255]
                            a[sredina + i][y + j] = -1; // already checked
                        }
                    }
                    colonies++;
                }
            }
        }
    }
    context.putImageData(imgdata, 0, 0);

    console.log("Counted colonies: ", colonies);
    document.getElementById("outputText").innerText = `Counted colonies: ${colonies} \n\nImage size: ${sirina}x${visina} px (original: ${slikaWidth}x${slikaHeight} px)`


}