#!/usr/bin/env bash
# 重新生成示例媒体（需要 ffmpeg）。生成结果刻意做小，仓库体积可控。
# 用法：bash samples/make.sh
set -euo pipefail
cd "$(dirname "$0")"

SRC=(-f lavfi -i testsrc2=size=480x270:rate=24:duration=10 -f lavfi -i sine=frequency=520:duration=10)
V=(-c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -g 48)
A=(-c:a aac -b:a 64k)

mkdir -p hls dash

ffmpeg -hide_banner -loglevel error -y "${SRC[@]}" "${V[@]}" "${A[@]}" -movflags +faststart demo.mp4
ffmpeg -hide_banner -loglevel error -y "${SRC[@]}" -c:v libx264 -profile:v baseline -pix_fmt yuv420p -crf 30 -g 48 "${A[@]}" -f flv demo.flv
ffmpeg -hide_banner -loglevel error -y "${SRC[@]}" "${V[@]}" "${A[@]}" \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename 'hls/seg%d.ts' hls/index.m3u8
ffmpeg -hide_banner -loglevel error -y "${SRC[@]}" "${V[@]}" "${A[@]}" \
  -f dash -seg_duration 4 -use_template 0 -use_timeline 0 \
  -init_seg_name 'init-$RepresentationID$.mp4' -media_seg_name 'chunk-$RepresentationID$-$Number$.m4s' dash/manifest.mpd

echo "done: $(du -sh . | cut -f1)"
