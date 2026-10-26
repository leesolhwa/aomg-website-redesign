#!/usr/bin/env bash
# AOMG 공식 사이트 이미지 다운로드 (img 폴더 안에서 실행: bash download-images.sh)
set -e
cd "$(dirname "$0")"
B="https://images.squarespace-cdn.com/content/v1/59e71dccf6576e2bd65ea29d"
Q="?format=2500w"
get() { echo "→ $1"; curl -fsSL "$2" -o "$1" || echo "  실패: $1"; }

get logo-aomg.png                 "$B/1508418380291-8IUTB17HNGVDUXQ6VWXQ/AOMG+LOGO.png"

get artist-yugyeom.jpg            "$B/dd1d14b7-9c1b-45da-b939-000bc6795292/07+%EB%A9%94%EC%9D%B8+%ED%94%84%EB%A1%9C%ED%95%84+-+%EC%9C%A0%EA%B2%B8+%28YUGYEOM%29+%282%EC%9B%94+21%EC%9D%BC+%28%EC%88%98%29+%EC%98%A4%ED%9B%84+6%EC%8B%9C+%EA%B5%90%EC%B2%B4%29.jpg$Q"
get artist-jvckiwai.jpg           "$B/261c58fb-04a0-40aa-ae5b-405aaa97baa4/%28%E1%84%91%E1%85%B3%E1%84%85%E1%85%A9%E1%84%91%E1%85%B5%E1%86%AF%E1%84%89%E1%85%A1%E1%84%8C%E1%85%B5%E1%86%AB_1x1%29+Jvcki+Wai_221013.jpg.jpg$Q"
get artist-kian84.jpg             "$B/4da4aea0-2aef-4f22-ae3f-c4a710e6b2d5/%EA%B8%B0%EC%95%8884+%ED%94%84%EB%A1%9C%ED%95%84+%EA%B7%B8%EB%A6%BC+%EC%9B%90%EB%B3%B8.jpg$Q"
get artist-koreanzombie.jpg       "$B/1575856834500-W7UQLMWI898T6DSPEVEY/KakaoTalk_Photo_2019-12-09-10-55-10.jpeg$Q"
get artist-leemijoo.jpg           "$B/bba5a0a9-5d98-4554-80ba-e51e01560128/03_1045+1+%281%29+%281%29.jpg$Q"
get artist-uglyduck.jpg           "$B/1513739432248-JXS5YDE0FATU50VN0VGB/Ugly+Duck+%28%C3%A6%C3%93%C2%B1%E2%82%AC%E2%88%8F%C3%86-%CB%86%29+2.jpg$Q"
get artist-kimkipyo.jpg           "$B/c6d44647-f150-42c5-b392-393f6b8a75da/KIMKIPY%C3%98_%E1%84%80%E1%85%AE%E1%86%A8%E1%84%82%E1%85%A2%E1%84%91%E1%85%B3%E1%84%85%E1%85%A9%E1%84%91%E1%85%B5%E1%86%AF.jpg$Q"
get artist-punchnello.png         "$B/c58ad2f1-8aaf-4424-9f06-49a414ddf6dc/%28%ED%94%84%EB%A1%9C%ED%95%84%29+%ED%8E%80%EC%B9%98%EB%84%AC%EB%A1%9C_%EC%A0%95%EB%B0%A9%ED%98%95.png$Q"
get artist-keyveatz.jpg           "$B/fa2cb578-ed8c-400e-866b-fd27313315b6/%E1%84%83%E1%85%A1%E1%86%AB%E1%84%8E%E1%85%A6_%E1%84%91%E1%85%B3%E1%84%85%E1%85%A9%E1%84%91%E1%85%B5%E1%86%AF_%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%87%E1%85%A1%E1%86%BC%E1%84%92%E1%85%A7%E1%86%BC.jpg$Q"
get artist-sikkoo.jpg             "$B/cb99d2a0-d128-4411-a481-889dd5cdf36f/%E1%84%89%E1%85%B5%E1%86%A8%E1%84%80%E1%85%AE_%E1%84%91%E1%85%B3%E1%84%85%E1%85%A9%E1%84%91%E1%85%B5%E1%86%AF_%E1%84%83%E1%85%A1%E1%86%AB%E1%84%8E%E1%85%A6_%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%87%E1%85%A1%E1%86%BC%E1%84%92%E1%85%A7%E1%86%BC.jpg$Q"

get release-keyveatz-oxygen.jpg   "$B/1782813407823-ECLB58EFEW90XSQHID0G/KVZ_DSCOVER.jpg$Q"
get release-keyveatz-keybeats.jpg "$B/1778722531285-BFS5X9R3V5YMWSQ98KBZ/Pre_KEYBEATS_DS+%282%29.jpg$Q"

get news-keyveatz-messygirls.jpg  "$B/1781086050048-K7AB2DHJE0B5JY85VBJN/image-asset.jpeg$Q"
get news-kian84-baeksang.jpg      "$B/1778290177142-SG4G5XQKAVJC088JECTN/image-asset.jpeg$Q"
get news-keyveatz-kangyeseul.jpg  "$B/1777107695067-M0368DZKWMS4K2PLZ3X8/image-asset.jpeg$Q"
get news-keyveatz-umjione.jpg     "$B/1777025894648-FU6WSOLPQWJ6GF2UM24U/image-asset.jpeg$Q"

get video-keyveatz-01.jpg         "$B/1782813147852-6J7ROBFRE998TDIVW0TF/image-asset.jpeg"
get video-keyveatz-02.jpg         "$B/1778722995963-AIZ6XKG4NVIW3U5SII3L/image-asset.jpeg"
get video-keyveatz-03.jpg         "$B/1778722939949-SHA616NG0IH85A7S2TKX/image-asset.jpeg"

echo "완료"
