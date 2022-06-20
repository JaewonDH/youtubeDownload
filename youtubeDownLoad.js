const cp = require("child_process");
const readline = require("readline");
const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const tracker = {
  start: Date.now(),
  audio: { downloaded: 0, total: Infinity },
  video: { downloaded: 0, total: Infinity },
  merged: { frame: 0, speed: "0x", fps: 0 },
};

let ffmpegProcess;
let audio;
let video;

// Prepare the progress bar
let progressbarHandle = null;

const progressbarInterval = 1000;

const initFFmpeg = (fileName) => {
  ffmpegProcess = cp.spawn(
    ffmpeg,
    [
      // Remove ffmpeg's console spamming
      "-loglevel",
      "8",
      "-hide_banner",
      // Redirect/Enable progress messages
      "-progress",
      "pipe:3",
      // Set inputs
      "-i",
      "pipe:4",
      "-i",
      "pipe:5",
      // Map audio & video from streams
      "-map",
      "0:a",
      "-map",
      "1:v",
      // Keep encoding
      "-c:v",
      "copy",
      // Define output file
      fileName,
    ],
    {
      windowsHide: true,
      stdio: [
        /* Standard: stdin, stdout, stderr */
        "inherit",
        "inherit",
        "inherit",
        /* Custom: pipe:3, pipe:4, pipe:5 */
        "pipe",
        "pipe",
        "pipe",
      ],
    }
  );

  ffmpegProcess.on("close", () => {
    readline.cursorTo(process.stdout, 0);
    process.stdout.write("\n\n\n\n");
    console.log("다운로드 완료");
    // Cleanup
    clearInterval(progressbarHandle);
  });

  // Link streams
  // FFmpeg creates the transformer streams and we just have to insert / read data
  ffmpegProcess.stdio[3].on("data", (chunk) => {
    // Start the progress bar
    if (!progressbarHandle)
      progressbarHandle = setInterval(showProgress, progressbarInterval);
    // Parse the param=value list returned by ffmpeg
    const lines = chunk.toString().trim().split("\n");
    const args = {};
    for (const l of lines) {
      const [key, value] = l.split("=");
      args[key.trim()] = value.trim();
    }
    tracker.merged = args;
  });
};
const initYdtl = (url) => {
  // Get audio and video streams
  audio = ytdl(url, { quality: "highestaudio" }).on(
    "progress",
    (_, downloaded, total) => {
      tracker.audio = { downloaded, total };
    }
  );
  video = ytdl(url, { quality: "highestvideo" }).on(
    "progress",
    (_, downloaded, total) => {
      tracker.video = { downloaded, total };
    }
  );
};

const showProgress = () => {
  readline.cursorTo(process.stdout, 0);
  const toMB = (i) => (i / 1024 / 1024).toFixed(2);

  process.stdout.write(
    `Audio  | ${(
      (tracker.audio.downloaded / tracker.audio.total) *
      100
    ).toFixed(2)}% processed `
  );
  process.stdout.write(
    `(${toMB(tracker.audio.downloaded)}MB of ${toMB(
      tracker.audio.total
    )}MB).${" ".repeat(10)}\n`
  );

  process.stdout.write(
    `Video  | ${(
      (tracker.video.downloaded / tracker.video.total) *
      100
    ).toFixed(2)}% processed `
  );
  process.stdout.write(
    `(${toMB(tracker.video.downloaded)}MB of ${toMB(
      tracker.video.total
    )}MB).${" ".repeat(10)}\n`
  );

  process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
  process.stdout.write(
    `(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${" ".repeat(
      10
    )}\n`
  );

  process.stdout.write(
    `running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(
      2
    )} Minutes.`
  );
  readline.moveCursor(process.stdout, 0, -3);
};

const getFileName = (name) => {
  {
    if (name.length > 20) {
      name = name.substring(0, 9);
    }
    return name;
  }
};

const deleteFileToDownload = (fileName) => {
  fs.unlink("./" + fileName, (err) => {
    if (err != null && err.code == "ENOENT") {
      console.log("파일 삭제 Error 발생");
    } else {
      audio.pipe(ffmpegProcess.stdio[4]);
      video.pipe(ffmpegProcess.stdio[5]);
    }
  });
};

rl.on("line", async function (inputValue) {
  onInputUrlEvent(inputValue);
});

const onInputUrlEvent = async (inputValue) => {
  let validate = await ytdl.validateURL(inputValue);
  if (validate) {
    rl.pause();
    console.log("조회중.......... 잠시만 기다려주세요");
    let info = await ytdl.getInfo(inputValue);
    console.log("입력한 주소:", inputValue);
    console.log("영상 이름:", info.videoDetails.title);
    rl.close();
    const fileName = getFileName(info.videoDetails.title) + ".mp4";
    initYdtl(inputValue);
    initFFmpeg(getFileName(info.videoDetails.title) + ".mp4");

    fs.stat("./" + fileName, (err, stats) => {
      if (err !== null && err.code === "ENOENT") {
        audio.pipe(ffmpegProcess.stdio[4]);
        video.pipe(ffmpegProcess.stdio[5]);
      } else {
        deleteFileToDownload(fileName);
      }
    });
  } else {
    console.log("다운받을 수 없는 주소야!!!");
    process.stdout.write("주소를 입력해주세요:");
  }
};

process.stdout.write("주소를 입력해주세요:");
