"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FilesetResolver,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";

type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

type ExerciseType =
  | "squat"
  | "bicep_curl"
  | "shoulder_press";

type SessionState =
  | "idle"
  | "preparing"
  | "active"
  | "stopped";

type ExerciseOption = {
  id: ExerciseType;
  name: string;
  description: string;
  instruction: string;
  cameraInstruction: string;
  image: string;
};

const PREPARATION_SECONDS = 7;

const exercises: ExerciseOption[] = [
  {
    id: "squat",
    name: "Bodyweight Squat",
    description:
      "Tracks knee and hip movement.",
    instruction:
      "Stand upright with your feet about shoulder-width apart and your arms relaxed.",
    cameraInstruction:
      "Make sure your full body, including your feet, is visible in the camera.",
    image:
      "/form-coach/squat-start.png",
  },

  {
    id: "bicep_curl",
    name: "Bicep Curl",
    description:
      "Tracks elbow flexion and extension.",
    instruction:
      "Stand upright with your arms extended by your sides and keep your elbows close to your body.",
    cameraInstruction:
      "Keep your upper body, elbows and both hands clearly visible.",
    image:
      "/form-coach/bicep-curl-start.png",
  },

  {
    id: "shoulder_press",
    name: "Shoulder Press",
    description:
      "Tracks your arms from shoulder level to overhead.",
    instruction:
      "Stand upright with both hands at shoulder level and your elbows bent.",
    cameraInstruction:
      "Keep your upper body and both arms fully visible in the camera.",
    image:
      "/form-coach/shoulder-press-start.png",
  },
];

export default function FormCoachPage() {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const poseLandmarkerRef =
    useRef<PoseLandmarker | null>(
      null
    );

  const animationFrameRef =
    useRef<number | null>(
      null
    );

  const countdownIntervalRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const selectedExerciseRef =
    useRef<ExerciseType>(
      "squat"
    );

  const trackingActiveRef =
    useRef(false);

  const squatBottomReachedRef =
    useRef(false);

  const curlTopReachedRef =
    useRef(false);

  const pressBottomReachedRef =
    useRef(false);

  const [loading, setLoading] =
    useState(true);

  const [
    cameraStarted,
    setCameraStarted,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    poseDetected,
    setPoseDetected,
  ] = useState(false);

  const [
    selectedExercise,
    setSelectedExercise,
  ] =
    useState<ExerciseType>(
      "squat"
    );

  const [
    sessionState,
    setSessionState,
  ] =
    useState<SessionState>(
      "idle"
    );

  const [
    countdown,
    setCountdown,
  ] = useState(
    PREPARATION_SECONDS
  );

  const [
    primaryAngle,
    setPrimaryAngle,
  ] =
    useState<number | null>(
      null
    );

  const [
    secondaryAngle,
    setSecondaryAngle,
  ] =
    useState<number | null>(
      null
    );

  const [
    movementPhase,
    setMovementPhase,
  ] =
    useState(
      "not detected"
    );

  const [repCount, setRepCount] =
    useState(0);

  /*
   * --------------------------------------------------
   * CALCULATE JOINT ANGLE
   * --------------------------------------------------
   */
  const calculateAngle = (
    pointA: Landmark,
    pointB: Landmark,
    pointC: Landmark
  ) => {
    const radians =
      Math.atan2(
        pointC.y - pointB.y,
        pointC.x - pointB.x
      ) -
      Math.atan2(
        pointA.y - pointB.y,
        pointA.x - pointB.x
      );

    let angle =
      Math.abs(
        radians *
          (180 / Math.PI)
      );

    if (angle > 180) {
      angle =
        360 - angle;
    }

    return angle;
  };

  /*
   * --------------------------------------------------
   * RESET MOVEMENT MEMORY
   * --------------------------------------------------
   */
  const resetMovementMemory =
    () => {
      squatBottomReachedRef.current =
        false;

      curlTopReachedRef.current =
        false;

      pressBottomReachedRef.current =
        false;
    };

  /*
   * --------------------------------------------------
   * CLEAR COUNTDOWN
   * --------------------------------------------------
   */
  const clearCountdown =
    () => {
      if (
        countdownIntervalRef.current
      ) {
        clearInterval(
          countdownIntervalRef.current
        );

        countdownIntervalRef.current =
          null;
      }
    };

  /*
   * --------------------------------------------------
   * START PREPARATION COUNTDOWN
   * --------------------------------------------------
   */
  const startPreparation =
    () => {
      clearCountdown();

      trackingActiveRef.current =
        false;

      resetMovementMemory();

      setRepCount(0);

      setCountdown(
        PREPARATION_SECONDS
      );

      setSessionState(
        "preparing"
      );

      let remaining =
        PREPARATION_SECONDS;

      countdownIntervalRef.current =
        setInterval(() => {
          remaining -= 1;

          setCountdown(
            remaining
          );

          if (
            remaining <= 0
          ) {
            clearCountdown();

            resetMovementMemory();

            setRepCount(0);

            trackingActiveRef.current =
              true;

            setSessionState(
              "active"
            );
          }
        }, 1000);
    };

  /*
   * --------------------------------------------------
   * STOP SET
   * --------------------------------------------------
   */
  const stopSet = () => {
    clearCountdown();

    trackingActiveRef.current =
      false;

    resetMovementMemory();

    setSessionState(
      "stopped"
    );
  };

  /*
   * --------------------------------------------------
   * CHANGE EXERCISE
   * --------------------------------------------------
   */
  const changeExercise = (
    exercise: ExerciseType
  ) => {
    clearCountdown();

    setSelectedExercise(
      exercise
    );

    selectedExerciseRef.current =
      exercise;

    trackingActiveRef.current =
      false;

    resetMovementMemory();

    setRepCount(0);

    setPrimaryAngle(
      null
    );

    setSecondaryAngle(
      null
    );

    setMovementPhase(
      "not detected"
    );

    if (cameraStarted) {
      setTimeout(
        () => {
          startPreparation();
        },
        0
      );
    } else {
      setSessionState(
        "idle"
      );
    }
  };

  /*
   * --------------------------------------------------
   * LOAD MEDIAPIPE
   * --------------------------------------------------
   */
  useEffect(() => {
    const videoElement =
      videoRef.current;

    const loadModel =
      async () => {
        try {
          const vision =
            await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

          const poseLandmarker =
            await PoseLandmarker.createFromOptions(
              vision,
              {
                baseOptions: {
                  modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
                },

                runningMode:
                  "VIDEO",

                numPoses: 1,
              }
            );

          poseLandmarkerRef.current =
            poseLandmarker;

          setLoading(false);
        } catch (error) {
          console.error(
            "Failed to load MediaPipe:",
            error
          );

          setError(
            "Could not load the pose detection model."
          );

          setLoading(false);
        }
      };

    loadModel();

    return () => {
      clearCountdown();

      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      const stream =
        videoElement
          ?.srcObject as
          | MediaStream
          | null;

      stream
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      poseLandmarkerRef.current?.close();
    };
  }, []);

  /*
   * --------------------------------------------------
   * START CAMERA
   * --------------------------------------------------
   */
  const startCamera =
    async () => {
      try {
        setError("");

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode:
                  "user",
              },

              audio: false,
            }
          );

        if (
          !videoRef.current
        ) {
          return;
        }

        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();

        setCameraStarted(
          true
        );

        resetMovementMemory();

        setRepCount(0);

        detectPose();

        startPreparation();
      } catch (error) {
        console.error(
          "Camera access error:",
          error
        );

        setError(
          "Camera access was denied or unavailable."
        );
      }
    };

  /*
   * --------------------------------------------------
   * ANALYSE SQUAT
   * --------------------------------------------------
   */
  const analyseSquat = (
    landmarks: Landmark[]
  ) => {
    const leftShoulder =
      landmarks[11];

    const rightShoulder =
      landmarks[12];

    const leftHip =
      landmarks[23];

    const rightHip =
      landmarks[24];

    const leftKnee =
      landmarks[25];

    const rightKnee =
      landmarks[26];

    const leftAnkle =
      landmarks[27];

    const rightAnkle =
      landmarks[28];

    const leftKneeAngle =
      calculateAngle(
        leftHip,
        leftKnee,
        leftAnkle
      );

    const rightKneeAngle =
      calculateAngle(
        rightHip,
        rightKnee,
        rightAnkle
      );

    const averageKneeAngle =
      (leftKneeAngle +
        rightKneeAngle) /
      2;

    const leftHipAngle =
      calculateAngle(
        leftShoulder,
        leftHip,
        leftKnee
      );

    const rightHipAngle =
      calculateAngle(
        rightShoulder,
        rightHip,
        rightKnee
      );

    const averageHipAngle =
      (leftHipAngle +
        rightHipAngle) /
      2;

    setPrimaryAngle(
      Math.round(
        averageKneeAngle
      )
    );

    setSecondaryAngle(
      Math.round(
        averageHipAngle
      )
    );

    if (
      averageKneeAngle <
      110
    ) {
      setMovementPhase(
        "bottom"
      );

      if (
        trackingActiveRef.current
      ) {
        squatBottomReachedRef.current =
          true;
      }

      return;
    }

    if (
      averageKneeAngle >
      160
    ) {
      setMovementPhase(
        "standing"
      );

      if (
        trackingActiveRef.current &&
        squatBottomReachedRef.current
      ) {
        setRepCount(
          (count) =>
            count + 1
        );

        squatBottomReachedRef.current =
          false;
      }

      return;
    }

    setMovementPhase(
      "moving"
    );
  };

  /*
   * --------------------------------------------------
   * ANALYSE BICEP CURL
   * --------------------------------------------------
   */
  const analyseBicepCurl = (
    landmarks: Landmark[]
  ) => {
    const leftShoulder =
      landmarks[11];

    const rightShoulder =
      landmarks[12];

    const leftElbow =
      landmarks[13];

    const rightElbow =
      landmarks[14];

    const leftWrist =
      landmarks[15];

    const rightWrist =
      landmarks[16];

    const leftHip =
      landmarks[23];

    const rightHip =
      landmarks[24];

    const leftElbowAngle =
      calculateAngle(
        leftShoulder,
        leftElbow,
        leftWrist
      );

    const rightElbowAngle =
      calculateAngle(
        rightShoulder,
        rightElbow,
        rightWrist
      );

    const averageElbowAngle =
      (leftElbowAngle +
        rightElbowAngle) /
      2;

    const leftShoulderAngle =
      calculateAngle(
        leftHip,
        leftShoulder,
        leftElbow
      );

    const rightShoulderAngle =
      calculateAngle(
        rightHip,
        rightShoulder,
        rightElbow
      );

    const averageShoulderAngle =
      (leftShoulderAngle +
        rightShoulderAngle) /
      2;

    setPrimaryAngle(
      Math.round(
        averageElbowAngle
      )
    );

    setSecondaryAngle(
      Math.round(
        averageShoulderAngle
      )
    );

    if (
      averageElbowAngle <
      70
    ) {
      setMovementPhase(
        "curled"
      );

      if (
        trackingActiveRef.current
      ) {
        curlTopReachedRef.current =
          true;
      }

      return;
    }

    if (
      averageElbowAngle >
      150
    ) {
      setMovementPhase(
        "arms extended"
      );

      if (
        trackingActiveRef.current &&
        curlTopReachedRef.current
      ) {
        setRepCount(
          (count) =>
            count + 1
        );

        curlTopReachedRef.current =
          false;
      }

      return;
    }

    setMovementPhase(
      "curling"
    );
  };

  /*
   * --------------------------------------------------
   * ANALYSE SHOULDER PRESS
   * --------------------------------------------------
   */
  const analyseShoulderPress = (
    landmarks: Landmark[]
  ) => {
    const leftHip =
      landmarks[23];

    const rightHip =
      landmarks[24];

    const leftShoulder =
      landmarks[11];

    const rightShoulder =
      landmarks[12];

    const leftElbow =
      landmarks[13];

    const rightElbow =
      landmarks[14];

    const leftWrist =
      landmarks[15];

    const rightWrist =
      landmarks[16];

    const leftElbowAngle =
      calculateAngle(
        leftShoulder,
        leftElbow,
        leftWrist
      );

    const rightElbowAngle =
      calculateAngle(
        rightShoulder,
        rightElbow,
        rightWrist
      );

    const averageElbowAngle =
      (leftElbowAngle +
        rightElbowAngle) /
      2;

    const leftShoulderAngle =
      calculateAngle(
        leftHip,
        leftShoulder,
        leftElbow
      );

    const rightShoulderAngle =
      calculateAngle(
        rightHip,
        rightShoulder,
        rightElbow
      );

    const averageShoulderAngle =
      (leftShoulderAngle +
        rightShoulderAngle) /
      2;

    setPrimaryAngle(
      Math.round(
        averageElbowAngle
      )
    );

    setSecondaryAngle(
      Math.round(
        averageShoulderAngle
      )
    );

    const averageWristY =
      (leftWrist.y +
        rightWrist.y) /
      2;

    const averageShoulderY =
      (leftShoulder.y +
        rightShoulder.y) /
      2;

    const wristsAboveShoulders =
      averageWristY <
      averageShoulderY;

    const pressBottom =
      averageElbowAngle <
        120 &&
      !wristsAboveShoulders;

    const pressTop =
      wristsAboveShoulders &&
      averageElbowAngle >
        145;

    if (pressBottom) {
      setMovementPhase(
        "lowered"
      );

      if (
        trackingActiveRef.current
      ) {
        pressBottomReachedRef.current =
          true;
      }

      return;
    }

    if (pressTop) {
      setMovementPhase(
        "overhead"
      );

      if (
        trackingActiveRef.current &&
        pressBottomReachedRef.current
      ) {
        setRepCount(
          (count) =>
            count + 1
        );

        pressBottomReachedRef.current =
          false;
      }

      return;
    }

    setMovementPhase(
      "pressing"
    );
  };

  /*
   * --------------------------------------------------
   * CHOOSE EXERCISE ANALYSIS
   * --------------------------------------------------
   */
  const analyseExercise = (
    landmarks: Landmark[]
  ) => {
    if (
      landmarks.length <
      29
    ) {
      setPrimaryAngle(
        null
      );

      setSecondaryAngle(
        null
      );

      setMovementPhase(
        "not detected"
      );

      return;
    }

    const exercise =
      selectedExerciseRef.current;

    if (
      exercise ===
      "squat"
    ) {
      analyseSquat(
        landmarks
      );

      return;
    }

    if (
      exercise ===
      "bicep_curl"
    ) {
      analyseBicepCurl(
        landmarks
      );

      return;
    }

    analyseShoulderPress(
      landmarks
    );
  };

  /*
   * --------------------------------------------------
   * DETECT POSE
   * --------------------------------------------------
   */
  const detectPose = () => {
    const video =
      videoRef.current;

    const poseLandmarker =
      poseLandmarkerRef.current;

    if (
      !video ||
      !poseLandmarker
    ) {
      return;
    }

    const runDetection =
      () => {
        if (
          video.readyState >=
          2
        ) {
          const now =
            performance.now();

          const result =
            poseLandmarker.detectForVideo(
              video,
              now
            );

          const landmarks =
            result
              .landmarks?.[0];

          const detected =
            Boolean(
              landmarks &&
                landmarks.length >
                  0
            );

          setPoseDetected(
            detected
          );

          if (landmarks) {
            analyseExercise(
              landmarks
            );
          } else {
            setPrimaryAngle(
              null
            );

            setSecondaryAngle(
              null
            );

            setMovementPhase(
              "not detected"
            );
          }

          drawPose(
            landmarks ?? []
          );
        }

        animationFrameRef.current =
          requestAnimationFrame(
            runDetection
          );
      };

    runDetection();
  };

  /*
   * --------------------------------------------------
   * DRAW SKELETON
   * --------------------------------------------------
   */
  const drawPose = (
    landmarks: Landmark[]
  ) => {
    const canvas =
      canvasRef.current;

    const video =
      videoRef.current;

    if (
      !canvas ||
      !video
    ) {
      return;
    }

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (
      landmarks.length ===
      0
    ) {
      return;
    }

    const connections:
      [number, number][] = [
      [11, 12],

      [11, 13],
      [13, 15],

      [12, 14],
      [14, 16],

      [11, 23],
      [12, 24],
      [23, 24],

      [23, 25],
      [25, 27],

      [24, 26],
      [26, 28],
    ];

    context.strokeStyle =
      "#86a63b";

    context.lineWidth =
      3;

    connections.forEach(
      ([
        startIndex,
        endIndex,
      ]) => {
        const start =
          landmarks[
            startIndex
          ];

        const end =
          landmarks[
            endIndex
          ];

        if (
          !start ||
          !end
        ) {
          return;
        }

        context.beginPath();

        context.moveTo(
          start.x *
            canvas.width,
          start.y *
            canvas.height
        );

        context.lineTo(
          end.x *
            canvas.width,
          end.y *
            canvas.height
        );

        context.stroke();
      }
    );

    landmarks.forEach(
      (landmark) => {
        context.beginPath();

        context.arc(
          landmark.x *
            canvas.width,
          landmark.y *
            canvas.height,
          5,
          0,
          Math.PI * 2
        );

        context.fillStyle =
          "#174b39";

        context.fill();
      }
    );
  };

  /*
   * --------------------------------------------------
   * UI INFORMATION
   * --------------------------------------------------
   */
  const activeExercise =
    exercises.find(
      (exercise) =>
        exercise.id ===
        selectedExercise
    ) ?? exercises[0];

  const metricLabels =
    selectedExercise ===
    "squat"
      ? {
          primary:
            "Knee angle",
          secondary:
            "Hip angle",
        }
      : {
          primary:
            "Elbow angle",
          secondary:
            "Shoulder angle",
        };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#86a63b]">
          Computer Vision
        </p>

        <h1 className="mt-2 text-4xl font-semibold tracking-[-.06em] text-[#174b39]">
          Exercise Form Coach
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#758078]">
          Select an exercise,
          position yourself using
          the reference guide and
          let the coach automatically
          track your repetitions.
        </p>

        {/* Exercise selection */}
        <section className="mt-8">
          <p className="mb-3 text-sm font-semibold text-[#174b39]">
            Choose an exercise
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {exercises.map(
              (exercise) => {
                const isActive =
                  selectedExercise ===
                  exercise.id;

                return (
                  <button
                    key={
                      exercise.id
                    }
                    type="button"
                    disabled={
                      sessionState ===
                      "active"
                    }
                    onClick={() =>
                      changeExercise(
                        exercise.id
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive
                        ? "border-[#174b39] bg-[#f0f5ed]"
                        : "border-[#dfe8de] bg-white hover:border-[#86a63b]"
                    }`}
                  >
                    <p className="font-semibold text-[#174b39]">
                      {
                        exercise.name
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#758078]">
                      {
                        exercise.description
                      }
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* Preparation guide */}
        {sessionState ===
          "preparing" && (
          <section className="mt-6 rounded-3xl border border-[#dfe8de] bg-[#f7f9f5] p-6">
            <div className="grid items-center gap-6 md:grid-cols-[260px_1fr]">
              <div className="overflow-hidden rounded-2xl border border-[#dfe8de] bg-white">
                <Image
                  src={
                    activeExercise.image
                  }
                  alt={`${activeExercise.name} starting position`}
                  width={520}
                  height={520}
                  className="aspect-square w-full object-cover"
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#86a63b]">
                  Get into position
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#174b39]">
                  {
                    activeExercise.name
                  }
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#56635a]">
                  {
                    activeExercise.instruction
                  }
                </p>

                <p className="mt-2 text-sm leading-6 text-[#758078]">
                  {
                    activeExercise.cameraInstruction
                  }
                </p>

                <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3">
                  <span className="text-sm font-medium text-[#758078]">
                    Set starts in
                  </span>

                  <span className="text-2xl font-bold text-[#174b39]">
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Camera */}
        <section className="mt-6 rounded-3xl border border-[#dfe8de] bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#174b39]">
                {
                  activeExercise.name
                }
              </p>

              <p className="mt-1 text-xs text-[#758078]">
                {sessionState ===
                "active"
                  ? "Set active — rep counting is enabled."
                  : sessionState ===
                      "preparing"
                    ? "Position yourself before the countdown ends."
                    : sessionState ===
                        "stopped"
                      ? "Set finished."
                      : activeExercise.cameraInstruction}
              </p>
            </div>

            {sessionState ===
              "active" && (
              <span className="rounded-full bg-[#eef5e9] px-3 py-1.5 text-xs font-semibold text-[#174b39]">
                Tracking active
              </span>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full"
            />

            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />

            {sessionState ===
              "preparing" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="rounded-full bg-white/90 px-7 py-5 text-center backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#758078]">
                    Starting in
                  </p>

                  <p className="mt-1 text-5xl font-bold text-[#174b39]">
                    {countdown}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            {!cameraStarted && (
              <button
                type="button"
                onClick={
                  startCamera
                }
                disabled={
                  loading
                }
                className="rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading
                  ? "Loading model..."
                  : "Start camera"}
              </button>
            )}

            {sessionState ===
              "active" && (
              <button
                type="button"
                onClick={
                  stopSet
                }
                className="rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white"
              >
                Stop set
              </button>
            )}

            {cameraStarted && (
              <p className="text-sm text-[#758078]">
                {poseDetected
                  ? "Pose detected"
                  : "Move into the camera frame"}
              </p>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          {/* Live metrics */}
          {poseDetected && (
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  {
                    metricLabels.primary
                  }
                </p>

                <p className="mt-1 text-2xl font-semibold text-[#174b39]">
                  {primaryAngle !==
                  null
                    ? `${primaryAngle}°`
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  {
                    metricLabels.secondary
                  }
                </p>

                <p className="mt-1 text-2xl font-semibold text-[#174b39]">
                  {secondaryAngle !==
                  null
                    ? `${secondaryAngle}°`
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  Movement
                </p>

                <p className="mt-1 text-xl font-semibold capitalize text-[#174b39]">
                  {
                    movementPhase
                  }
                </p>
              </div>

              <div className="rounded-xl bg-[#f6f8f4] p-4">
                <p className="text-xs text-[#8b968e]">
                  Reps
                </p>

                <p className="mt-1 text-2xl font-semibold text-[#174b39]">
                  {repCount}
                </p>
              </div>
            </div>
          )}

          {/* Finished set */}
          {sessionState ===
            "stopped" && (
            <div className="mt-6 rounded-2xl border border-[#dfe8de] bg-[#f7f9f5] p-5">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#86a63b]">
                Set complete
              </p>

              <p className="mt-2 text-3xl font-semibold text-[#174b39]">
                {repCount}{" "}
                {repCount === 1
                  ? "rep"
                  : "reps"}
              </p>

              <p className="mt-1 text-sm text-[#758078]">
                Your camera is
                still active. You
                can start another
                set or return to
                your dashboard.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={
                    startPreparation
                  }
                  className="rounded-full bg-[#174b39] px-5 py-3 text-sm font-semibold text-white"
                >
                  Start another set
                </button>

                <Link
                  href="/dashboard"
                  className="rounded-full border border-[#dfe8de] bg-white px-5 py-3 text-sm font-semibold text-[#174b39] transition hover:bg-[#f0f4ed]"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}