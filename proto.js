import fs from "node:fs";
import zlib from "node:zlib";
import { Buffer } from "node:buffer";

//open file

export async function readObj(filename, start = 0) {
  return new Promise((resolve, reject) => {
    const data = [];
    const boundary = Buffer.alloc(10);
    const readStream = fs.createReadStream(filename, {
      start: start,
      autoClose: true,
      emitClose: true,
      highWaterMark: 1 * 1024,
      //highWaterMark: 1 * 10,
    });

    readStream.on("error", (error) => {
      reject(error);
    });

    readStream.on("data", (buff) => {
      boundary.fill(buff.subarray(0, 5), 5);
      const checkDestroy = buff.indexOf("endobj"); //fails if buff ends in the middle of "endobj"
      const doubleCheck = boundary.indexOf("endobj"); //should cover buff ends in the middle of "endobj"
      if (checkDestroy == -1 && doubleCheck == -1) {
        data.push(...buff);
      } else {
        const endIndex = doubleCheck == -1 ? checkDestroy + 7 : doubleCheck + 1;
        data.push(...buff.subarray(0, endIndex));
        readStream.destroy();
      }
      boundary.fill(buff.subarray(-5));
    });

    readStream.on("close", () => {
      const raw = new Buffer.from(data);
      const start = 7 + raw.indexOf("stream"); //may fail /r/n EOL
      const end = raw.indexOf("endstream");
      console.log(start, end);
      resolve({
        content: Buffer.concat([raw.subarray(0, start), raw.subarray(end)]),
        stream: raw.subarray(start, end),
      });
    });
  });
}

//inflate FlateDecode
export async function decodeStream(stream) {
  return new Promise((resolve, reject) => {
    zlib.inflate(stream, (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
}
