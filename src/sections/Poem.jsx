"use client";

import { useEffect, useState } from "react";
import useSound from "use-sound";

// styles
import styles from "./Poem.module.css";

// icons
import MaterialSymbolsPlayArrowRounded from "@icons/MaterialSymbolsPlayArrowRounded";
import MaterialSymbolsLightPause from "@icons/MaterialSymbolsLightPause";

const Poem = ({ poem, voice }) => {
  const [play, { pause, duration, sound }] = useSound(voice, {
    volume: 0.5,
  });

  const [playing, setPlaying] = useState(false);
  const [seek, setSeek] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration / 1000);

  useEffect(() => {
    let timer;
    if (playing && sound) {
      timer = setInterval(() => {
        const currentTime = sound.seek();
        setSeek(currentTime);
      }, 200);
    } else if (!playing && sound) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeek(sound.seek());
    }

    return () => clearInterval(timer);
  }, [playing, sound, duration, actualDuration]);

  useEffect(() => {
    const setDuration = () => {
      if (duration && !actualDuration) {
        setActualDuration(duration / 1000);
      }
    };
    setDuration();
  }, [actualDuration, duration]);

  const seekHandler = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const elementWidth = rect.width;
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / elementWidth) * 100;
    if (sound) {
      let seeked = (percentage * actualDuration) / 100;
      if (seeked < 5) seeked = 0;
      sound.seek(seeked);
      setSeek(seeked);
    }
  };

  return (
    <div className={"w-full h-full flex flex-col justify-center "}>
      <div className={"bg-white p-5 rounded-xl shadow-md"}>
        <p className={"font-bold text-lg text-center"}>{poem.name}</p>
        <p className={"text-sm mt-4 flex justify-center gap-14"}>
          <span>{poem.description}</span>
          {/*<p className={"text-gray-500"}>*/}
          {/*  {new Date(poem.createdAt).toLocaleTimeString("fa-IR")}*/}
          {/*  {" - "}*/}
          {/*  {new Date(poem.createdAt).toLocaleDateString("fa-IR")}*/}
          {/*</p>*/}
        </p>
        <div className={"flex flex-col gap-2 mt-14"}>
          {poem?.couplets?.map((couplet) => {
            if (couplet.show)
              return (
                <div
                  onClick={() => {
                    sound.seek(couplet.start_time);
                    setSeek(couplet.start_time);
                  }}
                  key={couplet.id}
                  className={`flex gap-20 ${styles.couplet} ${couplet.start_time <= seek && seek < couplet.end_time && styles["current-couplet"]}`}
                >
                  <div className={"grow text-left"}>{couplet.verse1}</div>
                  <div className={"grow"}>{couplet.verse2}</div>
                </div>
              );
          })}
        </div>
        {poem.voice && (
          <div className={styles.container}>
            <div
              className={"w-full flex justify-center cursor-pointer "}
              onClick={() => {
                if (playing) {
                  pause();
                  setPlaying(false);
                } else if (sound) {
                  play();
                  setPlaying(true);
                }
              }}
            >
              {playing ? (
                <MaterialSymbolsLightPause className={styles.lgtext} />
              ) : (
                <MaterialSymbolsPlayArrowRounded className={styles.lgtext} />
              )}
              {/*{Number(seek).toFixed(0)}*/}
            </div>

            <div onClick={seekHandler} className={styles.outter}>
              <div
                style={{ width: (seek / (actualDuration || 1)) * 100 + "%" }}
                className={styles.inner}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Poem;
