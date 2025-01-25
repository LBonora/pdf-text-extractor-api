import fs from "node:fs";
import { Buffer } from "node:buffer";

export function getStartXref(fileName, fileSize = null, buffer = 64) {
  if (fileSize === null) {
    fileSize = fs.statSync(fileName).size;
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(fileName, { start: fileSize - buffer });
    stream.on("error", (error) => {
      reject(error);
    });
    stream.on("data", (data) => {
      const sliceStart = data.indexOf(new Buffer.from("startxref")) + 9;
      resolve(parseInt(data.slice(sliceStart)));
    });
  });
}

//const startxref = await getStartXref(fileName);
