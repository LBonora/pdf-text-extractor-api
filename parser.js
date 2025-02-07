const result = {};
let content = []; //keeps content info
let objKey = null; //kepps key values of result

//flow controll of special cases
const flags = {
  comment: false, //%.../r/n
  rawstr: false, // (...)
  name: false, // /.../s
  hexstr: false, // <...>
  array: false, // [...]
};

const whiteSpaces = {
  0x00: "null", //NUL
  0x09: "tab", //HT
  0x0a: "eol", //LF
  0x0c: "formfeed", //FF
  0x0d: "eol", //CR
  0x20: "space", //SP
};

const delimiters = {
  open: {
    0x25: "comment", // %
    0x28: "rawstr", //  (
    0x2f: "name", //    /
    0x3c: "hexstr", //  <
    0x5b: "array", //   [
    0x7b: "???", //     {
  },
  close: {
    0x29: "rawstr", //  )
    0x3e: "hexstr", //  >
    0x5d: "array", //   ]
    0x7d: "???", //     }
  },
};

export default function parsePdfDict(rawObject) {
  const start = rawObject.indexOf("<<");
  const end = rawObject.lastIndexOf(">>");
  rawObject = rawObject.subarray(start + 2, end); //gambiarra. Breaks dict handling
  /*console.log("\n--- START ---");
  console.log(stringfy(rawObject));
  console.log("-------------\n\n");*/

  for (let chr of rawObject) {
    if (flags.comment) {
      if (whiteSpaces[chr] == "eol") {
        flags.comment = false;
        content = [];
      } else {
        continue;
      }
    }

    if (Object.keys(delimiters.open).includes(chr.toString())) {
      const delimiter = delimiters.open[chr];
      !flags.array && saveContent(); //ignore content saving if array
      content.push(chr);
      flags[delimiter] = true;
    } else if (Object.keys(delimiters.close).includes(chr.toString())) {
      const delimiter = delimiters.close[chr];
      content.push(chr);
      !flags.array && saveContent(); //ignore content saving if array
      flags[delimiter] = false;
    } else if (Object.keys(whiteSpaces).includes(chr.toString())) {
      if (flags.name) {
        saveContent();
        flags.name = false;
      }
      if (content.length) {
        if (![0x20].includes(content[content.length - 1])) {
          content.push(0x20);
        }
      }
    } else {
      content.push(chr);
    }
  }
  saveContent();

  console.log("\n--------------");
  console.log(stringfy(rawObject));
  console.log("\n--- RESULT ---");
  console.log(result);
  console.log("--------------\n\n\n");
  return result;
}

function stringfy(content) {
  return Buffer.from(content).toString().trim();
}

function saveContent() {
  if (!content.length) {
    return;
  }
  //console.log("SAVING:", stringfy(content));
  if (objKey) {
    result[objKey] = stringfy(content); //string just for debugging
    objKey = null;
  } else {
    if (!flags.name) {
      console.error("objKey should be /name type");
      console.error("content:", stringfy(content));
      throw new Error();
    }
    objKey = stringfy(content).slice(1); //objKey must be string!
  }
  content = [];
}
