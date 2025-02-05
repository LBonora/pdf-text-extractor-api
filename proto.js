import fs, { read } from "node:fs";
import zlib from "node:zlib";
import { Buffer } from "node:buffer";

import parsePdfDict from "./parser.js";

//open file
export function readObj(
  filename,
  { start = 0, end = Infinity, endflag = "endobj" } = {},
) {
  return new Promise((resolve, reject) => {
    const data = [];
    const len = endflag.length - 1;
    const boundary = Buffer.alloc(2 * len);
    const readStream = fs.createReadStream(filename, {
      start,
      end,
      autoClose: true,
      emitClose: true,
      highWaterMark: 1 * 1024,
      //highWaterMark: 1 * 10,
    });

    readStream.on("error", (error) => {
      reject(error);
    });

    readStream.on("data", (buff) => {
      boundary.fill(buff.subarray(0, len), len);
      const checkDestroy = buff.indexOf(endflag); //fails if buff ends in the middle of "endobj"
      const doubleCheck = boundary.indexOf(endflag); //should cover buff ends in the middle of "endobj"
      if (checkDestroy == -1 && doubleCheck == -1) {
        data.push(...buff);
      } else {
        const endIndex =
          doubleCheck == -1 ? checkDestroy + len + 1 : doubleCheck;
        data.push(...buff.subarray(0, endIndex));
        readStream.destroy();
      }
      boundary.fill(buff.subarray(-len));
    });

    readStream.on("close", () => {
      const raw = new Buffer.from(data);
      const start = raw.indexOf("stream"); //*may* fail /r/n EOL
      const end = raw.indexOf("endstream");
      resolve({
        content: Buffer.concat([raw.subarray(0, start), raw.subarray(end)]),
        stream: raw.subarray(start + 7, end),
      });
    });
  });
}

//get startxref
export async function getXrefTable(filename, { tailSize = 64 } = {}) {
  const filesize = fs.statSync(filename).size;
  const { content: tail } = await readObj(filename, {
    start: filesize - tailSize,
    endflag: "%%EOF",
  });
  const xrefIndex = tail.indexOf("startxref") + 9;
  const startxref = parseInt(tail.subarray(xrefIndex));

  const { content: head } = await readObj(filename, {
    start: startxref,
    end: startxref + 4,
  });

  let temp;
  if (head.includes("xref")) {
    console.log("WIP: tipo normal", head.toString());
  } else {
    temp = await handleObjXrefTable(filename, startxref);
  }

  return {
    xref: "wip",
    root: "wip",
    startxref,
    temp,
  };
}

async function handleObjXrefTable(filename, startxref) {
  const { content, stream } = await readObj(filename, { start: startxref });
  const index = content.indexOf("\n");
  const endstream = content.indexOf("endstream");
  const objRef = content.subarray(0, index);
  console.log("TIPO OBJ");
  console.log("PROTO CONTENT\nXREF CONTENT\n");
  parsePdfDict(content.subarray(index + 1, endstream));
  console.log("END PROTO CONTENT");
  return { content, stream, objRef };
}
//inflate FlateDecode
export function decodeStream(stream) {
  return new Promise((resolve, reject) => {
    zlib.inflate(stream, (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
}
