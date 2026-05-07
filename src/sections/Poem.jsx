"use client";

// styles
import styles from "./Poem.module.css";

// icons
import MaterialSymbolsPlayArrowRounded from "@icons/MaterialSymbolsPlayArrowRounded";
import MaterialSymbolsLightPause from "@icons/MaterialSymbolsLightPause";

// hooks
import useAudio from "@hooks/useAudio";

// helper
import { clickPercent } from "@helper/click";

const Poem = ({ poem, voice }) => {
  const { playing, play, pause, seek, changeSeek, duration } = useAudio(voice);

  return (
    <div className={"w-full h-full flex flex-col justify-center "}>
      <div className={"bg-white p-5 rounded-xl shadow-md"}>
        <p className={"font-bold text-xl text-center text-(--text-primary)"}>
          {poem.name}
        </p>
        <p className={"text-sm mt-4 flex justify-center gap-14"}>
          <span>{poem.description}</span>
        </p>
        <div className={"flex flex-col gap-2 mt-14"}>
          {poem?.couplets?.map((couplet) => {
            if (couplet.show)
              return (
                <div
                  onClick={() => changeSeek(couplet.start_time)}
                  key={couplet.id}
                  className={`grid grid-cols-2 ${styles.couplet} ${couplet.start_time <= seek && seek < couplet.end_time && styles["current-couplet"]}`}
                >
                  <div className={"mx-10 text-left"}>{couplet.verse1}</div>
                  <div className={"mx-10"}>{couplet.verse2}</div>
                </div>
              );
          })}
        </div>
        {poem.voice && (
          <div className={styles.container}>
            <div
              className={"w-full flex justify-center cursor-pointer "}
              onClick={() => {
                if (playing) pause();
                else play();
              }}
            >
              {playing ? (
                <MaterialSymbolsLightPause className={styles.lgtext} />
              ) : (
                <MaterialSymbolsPlayArrowRounded className={styles.lgtext} />
              )}
            </div>

            <div
              onClick={(event) => {
                let percent = clickPercent(event);
                if (percent <= 5) percent = 0;
                changeSeek((percent * duration) / 100);
              }}
              className={styles.outter}
            >
              <div
                style={{ width: (seek / (duration || 1)) * 100 + "%" }}
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
