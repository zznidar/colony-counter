negative = false // If we want to analyse dark bacteria on light agar (e. g. HA in contrast to KA)
function analyse(slika, init=true, resize=true, negate=false) {
    negative = negate;
    colonies = 0;
    console.log(slika.width, slika.height);
    sirina = slika.width
    visina = slika.height

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
    // arr = [r00, g00, b00, a00, r10, g10, b10, a10] // Apparently bomo analizirali po vrsticah najprej.
    // r_xy = 0 + 4*x + 4*sirina*y

    const x_start = Math.max(S[0]-r, 0),
    y_start = Math.max(S[1]-r, 0),
    x_end = Math.min(S[0]+r, sirina),
    y_end = Math.min(S[1]+r, visina);
    for(let x = x_start; x < x_end; x++) { // 0; sirina
        let colonyStart, colonyEnd;
        for(let y = y_start; y < y_end; y++) { // 0; visina
            //x, y
            if(!isInCircle(x, y)) continue;
            if(istHell(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
                //console.log(x, y, "ist hell");
                colonyStart = y;
                y++;
                while(y < visina && istHell(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
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
            if(istHell(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
                //console.log(x, y, "ist hell");
                colonyStart = x;
                x++;
                while(x < sirina && istHell(arr.slice(0 + 4*x + 4*sirina*y, 4 + 4*x + 4*sirina*y))) { // pixel svetel
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

    console.log("Counted colonies: ", colonies);
    document.getElementById("outputText").innerText = `Counted colonies: ${colonies} \n\nImage size: ${sirina}x${visina} px (original: ${slika.width}x${slika.height} px)`
    


    
    let barve_temp_var_name = detectColour(sirina>>>1, visina>>>1, 100, 100, 4) // area must have area if we want to detect multiple colour groups. // Also, bitshift instead of /2 to prevent floats
    console.log(barve_temp_var_name);
    for(let i of barve_temp_var_name) {
        console.log(`%c${i}`, `background-color: rgb(${i[0]}, ${i[1]}, ${i[2]}); font-weight: bold;`);
    }
    context.putImageData(imgdata, 0, 0);
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

function setPixels(x, y, r, g, b, a) {
    arr_shallow[0 + 4*x + 4*sirina*y] = r;
    arr_shallow[1 + 4*x + 4*sirina*y] = g;
    arr_shallow[2 + 4*x + 4*sirina*y] = b;
    arr_shallow[3 + 4*x + 4*sirina*y] = a;

}

// circle
S = [500, 500];
r = 250;
function isInCircle(x, y) {
    return(distance([x, y], S) < r)
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
    return(groups.map(x => x.map(y => Math.round(y))))

    // If there's very few colonies, we don't get their colour. 
    // Create a new group only when there's a difference of more than some threshold?
}


function detectPetriDish(agarColour) {
    let x0, x1, y0, y1;
    // Sprehodimo se od roba proti sredini, iščoč 5-average agarja.
    for(let x = 0; x < sirina>>>1; x += 5) {
        let barvus = getAverageColour(x, visina>>>1, 5, 1);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(x, barvus, colourDistance(barvus, agarColour));
            canvas.getContext('2d').fillRect(x, visina>>>1, 20, 20)
            x0 = x;
            //return([x, visina>>>1]);
        }
    }

    for(let x = sirina; x > sirina>>>1; x -= 5) {
        let barvus = getAverageColour(x, visina>>>1, 5, 1);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(x, barvus, colourDistance(barvus, agarColour));
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = "blue";
            ctx.fillRect(x, visina>>>1, 20, 20)
            x1 = x;
        }
    }

    for(let y = 0; y < visina>>>1; y += 5) {
        let barvus = getAverageColour(sirina>>>1, y, 1, 5);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(y, barvus, colourDistance(barvus, agarColour));
            canvas.getContext('2d').fillRect(sirina>>>1, y, 20, 20)
            y0 = y;
        }
    }

    for(let y = visina; y > visina>>>1; y -= 5) {
        let barvus = getAverageColour(sirina>>>1, y, 1, 5);
        if(colourDistance(barvus, agarColour) < 20) {
            console.log(y, barvus, colourDistance(barvus, agarColour));
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = "blue";
            ctx.fillRect(sirina>>>1, y, 20, 20);
            y1 = y;
        }
    }

    // Now precisely find the edge (by removing pixels from the edgy-5-pixels, one-by-one)

    // Krožnica je zdaj natanko določena. Analiziramo samo znotraj nje.
            

    // TODO: Draw a graph of distance (or better, ratio of distances) to set the threshold. Probably when there's a big enough change && colour is close enough.

    // Also, maybe if pixel is close enough to black/white, skip it when calculating avg distance (it's probably flomaster) // Maybe that's not even needed -- flomaster is more than 5 px away from agar edge :shrug:
}