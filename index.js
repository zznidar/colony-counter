function analyse(slika) {
    colonies = 0;
    console.log(slika.width, slika.height);
    sirina = slika.width
    visina = slika.height

    canvas.width = sirina
    canvas.height = visina

    context.drawImage(base_image, 0, 0);

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

    for(let x = 0; x < sirina; x++) { // 0; sirina
        let colonyStart, colonyEnd;
        for(let y = 0; y < visina; y++) { // 0; visina
            //x, y
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

    for(let y = 0; y < visina; y++) { // 0; sirina
        let colonyStart, colonyEnd;
        for(let x = 0; x < sirina; x++) { // 0; visina
            //x, y
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
                    for(let i = -1; i < 2; i++) {
                        for(let j = -1; j < 2; j++) {
                            setPixels(sredina + i, y + j, ...centre_colour);
                        }
                    }
                    colonies++;
                }
            }
        }
    }

    console.log("Counted colonies: ", colonies);

    


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

    return(L > L_threshold);
}

function setPixels(x, y, r, g, b, a) {
    arr_shallow[0 + 4*x + 4*sirina*y] = r;
    arr_shallow[1 + 4*x + 4*sirina*y] = g;
    arr_shallow[2 + 4*x + 4*sirina*y] = b;
    arr_shallow[3 + 4*x + 4*sirina*y] = a;

}


// context.getImageData(x, y, sirina, visina).data // sirina = visina = 1, ce hocemo 1 pixel
