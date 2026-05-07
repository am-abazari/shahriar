import { useEffect, useState } from "react";
import useSound from "use-sound";

const useAudio = (url) => {
  const [play, { pause, duration, sound }] = useSound(url, {
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

  const playAudio = () => {
    if (sound) {
      play();
      setPlaying(true);
    }
  };
  const pauseAudio = () => {
    pause();
    setPlaying(false);
  };

  useEffect(() => {
    const spaceHandler = (key) => {
      if (key.code === "Space") {
        if (playing) {
          pause();
          setPlaying(false);
        } else if (sound) {
          play();
          setPlaying(true);
        }
      }
    };
    window.addEventListener("keydown", spaceHandler);
    return () => window.removeEventListener("keydown", spaceHandler);
  });

  const changeSeek = (seekTime) => {
    if (sound) {
      sound.seek(seekTime);
      setSeek(seekTime);
    }
  };
  useEffect(() => {
    if (duration - seek * 1000 < 200) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      changeSeek(0);
      pauseAudio();
      playAudio();
    }
  }, [changeSeek, duration, pauseAudio, seek]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    pauseAudio();
  }, [url]);

  return {
    playing,
    play: playAudio,
    pause: pauseAudio,
    seek,
    changeSeek,
    duration: actualDuration,
  };
};

export default useAudio;
