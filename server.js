const express = require("express");
// const axios = require("axios");
const app = express();
const port = process.env.PORT || 3000;
const apikey = "AIzaSyDKNhWZnOl02XrNBSiNUUPPYZ-xCmb5szs";
// const baseApiUrl = "https://www.googleapis.com/youtube/v3";
const { google } = require("googleapis");
// const { vttToPlainText } = require("vtt-to-text");
// const fs = require("fs").promises;
const youtube = google.youtube({ version: "v3", auth: apikey });

main().catch((err) => console.log(err));

async function main() {
  app.listen(port, (err) => {
    if (err) throw err;
    console.log("Listening on " + port);
  });

  //   app.use(bodyParser.json());
  //   app.use(bodyParser.urlencoded({extended: false}));

  app.use(express.static(__dirname + "/public"));
  app.set("view engine", "ejs");
  app.get("/", async (req, res) => {
    res.render("index.ejs");
  });

  app.get("/thumbnail", async (req, res) => {
    let videoId = req.query.videoId;
    youtube.videos
      .list({
        part: "snippet",
        id: videoId,
      })
      .then((result) => {
        let info = result.data.items[0].snippet;
        res.json({
          thumbnailUrl: info.thumbnails.default.url,
          title: info.title,
        });
      })
      .catch((err) => res.json({ error: "Invalid Url Or Server Error!" }));
  });

  app.get("/comment-search", async (req, res) => {
    let videoId = req.query.videoId;
    let searchBy = req.query.searchBy;
    let query = req.query.query;
    getAllPagesComments(videoId, "", 0)
      .then((result) => {
        if (searchBy == "user" && query)
          result = result.filter((r) =>
            r.user.toLowerCase().includes(query.toLowerCase())
          );
        else if (query)
          result = result.filter((r) =>
            r.text.toLowerCase().includes(query.toLowerCase())
          );
        res.json(result);
      })
      .catch((err) => res.json({ error: "Invalid Url Or Server Error!" }));
  });

  app.get("/random-picker", async (req, res) => {
    let videoId = req.query.videoId;
    let keyword = req.query.keyword;
    getAllPagesComments(videoId, "", 0)
      .then((result) => {
        if (keyword)
          result = result.filter((r) =>
            r.text.toLowerCase().includes(keyword.toLowerCase())
          );
        let rnd = result[Math.floor(Math.random() * result.length)];
        res.json(rnd);
      })
      .catch((err) => res.json({ error: "Invalid Url Or Server Error!" }));
  });

  app.get("/caption", async (req, res) => {
    let videoId = req.query.videoId;
    const response = await youtube.captions.list({
      part: "snippet",
      videoId: videoId,
    });
    let list = response.data.items.map((item) => {
      return {
        language: item.snippet.language,
      };
    });

    res.json(list);
  });
}
const getAllPagesComments = (videoId, pageToken, i) => {
  return getOnePageComment(videoId, pageToken).then((r) => {
    const result = r.result;
    if (!r.nextPageToken || i > 10) return result;
    // Recursive step: get the rest of the pages, then concat it
    return getAllPagesComments(videoId, r.nextPageToken, i + 1).then(
      (restOfVideoIds) => result.concat(restOfVideoIds)
    );
  });
};

const getOnePageComment = async (videoId, pageToken) => {
  const response = await youtube.commentThreads.list({
    part: "snippet",
    videoId: videoId,
    maxResults: 100,
    order: "relevance",
    pageToken: pageToken,
  });
  result = response.data.items.map((item) => {
    return {
      user: item.snippet.topLevelComment.snippet.authorDisplayName,
      userImg: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
      text: item.snippet.topLevelComment.snippet.textOriginal,
      likeCount: item.snippet.topLevelComment.snippet.likeCount,
      link: `https://www.youtube.com/watch?v=${videoId}&lc=${item.snippet.topLevelComment.id}`,
    };
  });

  return { nextPageToken: response.data.nextPageToken, result: result };
};

// let url = `${baseApiUrl}/search?key=${apikey}&type=video&part=snippet&q=${q}`;
// const response = await axios.get(url);
// console.log(response.data.items);
