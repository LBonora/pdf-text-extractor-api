/********************************************************************* /
/ still VERY buggy version, but gives what is needed for now          /
/ for now it parses Xref streams, with bug in indirect object entries /
/*********************************************************************/
const result = {};
let content = []; //keeps content info
let objKey = null; //kepps key values of result

//flow controll of special cases
const flags = {
  name: false,
  space: false,
  array: false,
  rawstr: false,
  hexstr: false,
};

export default function parsePdfDict(rawObject) {
  rawObject = rawObject.subarray(2, -3); //gambiarra. Breaks dict handling
  console.log("\n\nPARSER\n");
  console.log(rawObject.toString());

  for (let chr of rawObject) {
    chr == 0x2f && flags.name && flagHandler("name"); //0x2f == /
    chr == 0x2f && flags.space && flagHandler("name");
    //chr == 0x2f && nameHandler(); //0x2f == /

    (chr == 0x0a || chr == 0x20) && spaceHandler(); //0x0a,0x20 == \n <spc>

    chr == 0x2f && (flags.name = true); //0x2f == /

    chr == 0x5b && (flags.array = true); //0x5b == [
    chr == 0x3c && (flags.hexstr = true); //0x3c == <
    chr == 0x28 && (flags.rawstr = true); //0x28 == (

    content.push(chr);

    chr == 0x5d && flagHandler("array"); //0x5d == ]
    chr == 0x3e && flagHandler("hexstr"); //0x3e == >
    chr == 0x28 && flagHandler("rawstr"); //0x28 == )
  }

  console.log("\nPARSER RESULT");
  console.log(result);
  console.log("\nEND PARSER\n\n");
}

function flagHandler(flag) {
  !flags.array && !(flag == "array") && saveResult();
  flags[flag] = false;
}

function spaceHandler() {
  //ignoring space only content
  if (!stringfy(content)) {
    content = [];
    return;
  }

  if (flags.name) {
    saveResult();
    flags.space = false;
    flags.name = false;
  } else if (!flags.array) {
    flags.space = true;
    //we are ignoring spaces inside arrays
    //we should not find spaces inside pdf strings (raw or hex)
  }
}

//keeping individual handlers for debugging
//this function will fail with arrays inside arrays
function arrayHandler() {
  saveResult();
  flags.array = false;
}

function nameHandler() {
  saveResult();
  flags.name = false;
}

function hexstrHandler() {
  !flags.array && saveResult(); //content inside an array shall not be discarded yet
  flags.hexstr = false;
}

function stringfy(content) {
  return Buffer.from(content).toString().trim();
}

function saveResult() {
  if (objKey) {
    result[objKey] = stringfy(content); //string just for debugging
    objKey = null;
  } else {
    if (!flags.name) {
      console.error("objKey should be /name type");
      throw new Error();
    }
    objKey = stringfy(content); //objKey must be string!
  }
  content = [];
}
