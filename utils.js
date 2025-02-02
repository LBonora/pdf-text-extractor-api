import fs from "node:fs";
import { Buffer } from "node:buffer";

export function parsePdfObject(pdfObject) {
  const ender = pdfObject.indexOf(Buffer.from("stream"));
  let flag = false;
  console.log("NEW", pdfObject.slice(0, ender).toString());
  for (let chr of pdfObject.slice(0, ender)) {
    if (flag) {
      if (flag == 0x3c) {
        if (chr == 0x3c) {
          console.log("<<", "dict       start");
        } else {
          console.log("< ", "hex string start");
          flag = false;
        }
      } else if (flag == 0x3e) {
        if (chr == 0x3e) {
          console.log(">>", "dict         end");
        } else {
          console.log("> ", "hex string   end");
          flag = false;
        }
      }
    }
    if (chr == 0x2f) {
      console.log("/ ", "name       start");
    } else if (chr == 0x5b) {
      console.log("[ ", "array      start");
    } else if (chr == 0x5d) {
      console.log("] ", "array        end");
    } else if (chr == 0x28) {
      console.log("( ", "raw string start");
    } else if (chr == 0x29) {
      console.log(")", "raw string   end");
    } else if (chr == 0x3c || chr == 0x3e) {
      if (flag) {
        flag = false;
      } else {
        flag = chr;
      }
    }

    //<?; >?; <<; >>; (; ); [; ]; /; #20; #0a
  }
  /*
  28 (; 29 ); 2f /; 3c <; 3e >; 5b [; 5d ]
  dict: <<...>>
  string: <...> or (...)
  name: /...
  array: [...]

  */
}

export function getStartxref(fileName, fileSize = null, buffer = 64) {
  if (fileSize === null) {
    fileSize = fs.statSync(fileName).size;
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(fileName, { start: fileSize - buffer });
    stream.on("error", (error) => {
      reject(error);
    });
    stream.on("data", (data) => {
      const sliceStart = data.indexOf(Buffer.from("startxref")) + 9;
      resolve(parseInt(data.slice(sliceStart)));
    });
  });
}

export function getXrefTable(fileName, startxref) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(fileName, { start: startxref });
    stream.on("error", (error) => {
      reject(error);
    });
    stream.on("data", (data) => {
      const result = [];
      let curPos = 1 + data.indexOf(0x0a);
      let lastPos = 0;
      while (curPos > 0) {
        const foo = data.slice(lastPos, curPos);
        if (foo.includes(new Buffer.from("trailer"))) {
          break;
        }

        //if (data.slice(0, 4).includes(new Buffer.from("xref"))) {
        if (data.slice(0, 4).includes("xref")) {
          /*result.push({
            start: foo.slice(0, 10).toString(),
            gen: foo.slice(11, 16).toString() || null,
            sts: foo[17]?.toString() || null,
          });*/
          result.push(...foo);
        } else {
          result.push(...foo);
          if (foo.includes(new Buffer.from("endobj"))) {
            break;
          }
        }

        lastPos = curPos;
        curPos = 1 + data.indexOf(0x0a, curPos);
      }
      resolve(new Buffer.from(result));
    });
  });
}
