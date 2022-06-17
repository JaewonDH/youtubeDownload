const fs = require("fs");
const ytdl = require("ytdl-core");

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const URL_INPUT_MODE = 1;
const FORMAT_INPUT_MODE = 2;

let mode = URL_INPUT_MODE;
let url = "https://youtu.be/bK624uP-N2c";
let progresStr = "";
let formatList = [];

let downloadInfo = {
  url: "",
  filename: "",
};

rl.on("line", async function (inputValue) {
  if (mode == URL_INPUT_MODE) {
    onInputUrlEvent(inputValue);
  } else {
    onInputFormatEvent(inputValue);
  }
});

const onInputUrlEvent = async (inputValue) => {
  let validate = await ytdl.validateURL(inputValue);
  if (validate) {
    rl.pause();
    console.log("조회중.......... 잠시만 기다려주세요");
    let info = await ytdl.getInfo(inputValue);
    console.log("입력한 주소:", inputValue);
    console.log("영상 이름:", info.videoDetails.title);
    printFormat(info.formats);
    downloadInfo.url = inputValue;
    downloadInfo.filename = info.videoDetails.title + ".mp4";
    process.stdout.write("저장할 화질 번호를 입력해주세요:");
    mode = FORMAT_INPUT_MODE;
    rl.resume();
  } else {
    console.log("다운받을 수 없는 주소야!!!");
    process.stdout.write("주소를 입력해주세요:");
  }
};

const onInputFormatEvent = async (inputValue) => {
  let findList = formatList.filter((item) => item.itag == inputValue);
  if (findList.length > 0) {
    rl.resume();
    download(downloadInfo, findList[0]);
  } else {
    console.log(
      "선택한 번호가 잘못 되었습니다. 화질 종류에 있는 번호를 입력 해주세요"
    );
  }
};

const download = async (downloadInfo, format) => {
  startProgress();
  let stream = ytdl(downloadInfo.url, { format });
  stream.pipe(fs.createWriteStream(downloadInfo.filename));

  stream.on("error", function (error) {
    endProgress();
    console.log("error:", error);
  });

  stream.on("finish", function () {
    endProgress();
    console.log("");
    console.log("다운로드 끝");
    rl.close();
  });
};

const startProgress = () => {
  console.log("다운로드 중..");
  intervealId = setInterval(() => {
    if (progresStr.length == 30) {
      progresStr = "";
    }

    progresStr = progresStr + ".";
    process.stdout.write(progresStr);
  }, 500);
};

const endProgress = () => {
  clearInterval(intervealId);
};

const printFormat = (formats) => {
  console.log(
    "--------------------------영상 화질 종류--------------------------"
  );

  formatList = formats.filter((item) => {
    if (item.container == "mp4") {
      console.log(
        `번호:${item.itag}      quality:${
          item.qualityLabel
        }     size:${getFileSize(item.contentLength)}`
      );
      return true;
    }
  });

  console.log(
    "-------------------------------------------------------------------"
  );
};

const getFileSize = (size) => {
  return `${(size / (1024 * 1024)).toFixed(2)}MB`;
};

process.stdout.write("주소를 입력해주세요:");
