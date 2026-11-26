import test from "node:test";
import assert from "node:assert/strict";
import { canonicalResourceUrl, extractHrefFromMarkup, isYouTubeVideoId, resourceIdentity, youtubeVideoId } from "../src/resource-identity.js";

const VIDEO_ID = "dQw4w9WgXcQ";

test("URLs equivalentes do YouTube têm uma identidade única e preservam o ID cru", () => {
  const variants = [
    `https://www.youtube.com/watch?v=${VIDEO_ID}&utm_source=classauthor`,
    `https://youtu.be/${VIDEO_ID}?si=compartilhamento`,
    `https://youtube.com/shorts/${VIDEO_ID}#t=15`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    `https://youtube.com/live/${VIDEO_ID}?feature=share`,
    VIDEO_ID
  ];
  for (const value of variants) assert.equal(youtubeVideoId(value), VIDEO_ID);
  assert.equal(new Set(variants.map((value) => resourceIdentity(value, "video"))).size, 1);
  assert.equal(isYouTubeVideoId(VIDEO_ID), true);
  assert.equal(isYouTubeVideoId("abc123"), false);
});

test("URLs de artigo ignoram host www, âncora e parâmetros de rastreamento, mas mantêm query funcional", () => {
  const first = "https://www.example.org/artigo/?utm_source=feed&b=2&a=1#secao";
  const equivalent = "https://example.org/artigo?a=1&b=2&fbclid=rastreamento";
  assert.equal(canonicalResourceUrl(first), canonicalResourceUrl(equivalent));
  assert.equal(resourceIdentity(first, "artigo"), resourceIdentity(equivalent, "reading"));
  assert.notEqual(resourceIdentity(first, "artigo"), resourceIdentity("https://example.org/artigo?a=1&b=3", "artigo"));
});

test("identidade de URL rejeita esquemas não HTTP e extração de href decodifica query HTML", () => {
  assert.equal(canonicalResourceUrl("javascript:alert(1)"), "");
  assert.equal(resourceIdentity("", "artigo"), "");
  assert.equal(extractHrefFromMarkup('<a href="https://example.org/?a=1&amp;b=2">artigo</a>'), "https://example.org/?a=1&b=2");
});
