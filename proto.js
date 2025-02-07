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

//get xref table
export async function getXrefTable(filename, { tailSize = 64 } = {}) {
  const filesize = fs.statSync(filename).size;
  const { content: tail } = await readObj(filename, {
    start: filesize - tailSize,
    endflag: "%%EOF",
  });
  const xrefIndex = tail.indexOf("startxref") + 9;
  const startxref = parseInt(tail.subarray(xrefIndex));

  const { content, stream } = await readObj(filename, { start: startxref });

  const response = {
    xreftable: null,
    objRef: null,
    startxref,
    objDict: null,
    root: null,
  };

  if (content.subarray(0, 15).includes("xref")) {
    console.log("TIPO CLASSICO");
    response.xreftable = handleClassicXrefTable(content);
  } else {
    response.objDict = parsePdfDict(content);
    console.log("TIPO XREF OBJ");
    response.objRef = content.subarray(0, content.indexOf("\n"));
    const decodedStream = response.objDict.Filter
      ? await decodeStream(stream)
      : stream;
    response.xreftable = handleObjXrefTable(response.objDict, decodedStream);
  }
  return response;
}

function handleClassicXrefTable(content) {
  const response = {};
  console.log(content.toString());
  parsePdfDict(content);
  return response;
}

//special cases (e.g. W size != 3) not implemented
function handleObjXrefTable(objDict, stream) {
  const response = {};
  const [first, size] = arrayfy(objDict.Index);
  const w = arrayfy(objDict.W);
  const n = w.reduce((a, b) => a + b);
  const rework = [];
  for (let i = first; i < size; i++) {
    let key = i.toString() + " ";
    const args = { offset: null, type: "f", indirect: null, subindex: null };
    const typ = stream.readUIntBE(n * i, w[0]);
    const offset = stream.readUIntBE(n * i + w[0], w[1]);
    const gen = stream.readUIntBE(n * i + w[0] + w[1], w[2]);

    if (typ == 2) {
      key += "0 R";
      rework.push(key);
      args.type = "i";
      args.indirect = offset.toString() + " 0 R";
      args.subindex = gen;
    } else if (0 <= typ < 2) {
      key += gen.toString() + " R";
      args.type = ["f", "n"][typ];
      args.offset = offset;
    }
    response[key] = args;

    const info = stream.subarray(n * i, n * (i + 1));
  }

  for (const item of rework) {
    const indirect = response[item].indirect;
    response[item].offset = response[indirect].offset;
  }

  return response;
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

function arrayfy(string) {
  return string
    .slice(1, -1)
    .split(" ")
    .map((x) => parseInt(x));
}
