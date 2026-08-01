from pathlib import Path

p = Path("src/features/shorts/components/VideoEditor.tsx")
s = p.read_text()

old = """function frameLoop() {
            if (video.ended || video.paused) {
              resolve();
              return;
            }
            drawFrame(ctx, video, canvas.width, canvas.height);
            setProgress(Math.round((video.currentTime / video.duration) * 100));
            requestAnimationFrame(frameLoop);
          }"""

new = """function frameLoop() {
            if (!video) {
              resolve();
              return;
            }

            if (video.ended || video.paused) {
              resolve();
              return;
            }

            drawFrame(ctx, video, canvas.width, canvas.height);
            setProgress(Math.round((video.currentTime / video.duration) * 100));
            requestAnimationFrame(frameLoop);
          }"""

s = s.replace(old, new)

p.write_text(s)
