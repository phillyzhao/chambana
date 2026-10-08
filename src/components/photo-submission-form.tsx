"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useFormStatus } from "react-dom";
import { mutate } from "@/app/actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending || disabled}>
      <Camera size={17} />
      {pending ? "Saving & checking photo…" : "Submit photo"}
    </button>
  );
}

export function PhotoSubmissionForm({
  assignmentId,
  back,
}: {
  assignmentId: string;
  back: string;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const releaseCamera = useCallback(() => {
    request.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  const closeCamera = useCallback(() => {
    releaseCamera();
    setCameraOpen(false);
    setReady(false);
    setCapturing(false);
  }, [releaseCamera]);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    const details = upload.current?.closest("details");
    const onToggle = () => {
      if (!details?.open) closeCamera();
    };
    const onVisibility = () => {
      if (document.hidden) closeCamera();
    };
    details?.addEventListener("toggle", onToggle);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      details?.removeEventListener("toggle", onToggle);
      document.removeEventListener("visibilitychange", onVisibility);
      releaseCamera();
    };
  }, [closeCamera, releaseCamera]);

  async function openCamera() {
    closeCamera();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Your browser cannot open the camera here. Open Chambana over HTTPS in a supported browser, or choose a photo.",
      );
      return;
    }
    const currentRequest = request.current;
    setCameraOpen(true);
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      // A permission prompt may resolve after cancellation or navigation.
      if (currentRequest !== request.current || !video.current) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = camera;
      video.current.srcObject = camera;
      await video.current.play();
      if (currentRequest === request.current) setReady(true);
    } catch (cause) {
      if (currentRequest !== request.current) return;
      closeCamera();
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access in your browser, or choose a photo."
          : name === "NotFoundError"
            ? "No camera was found on this device. Connect a camera, or choose a photo."
            : "The camera could not start. Check that it is available, then try again or choose a photo.",
      );
    }
  }

  async function capturePhoto() {
    const source = video.current;
    if (!source?.videoWidth || !source.videoHeight) return;
    const currentRequest = request.current;
    setCapturing(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        1600 / Math.max(source.videoWidth, source.videoHeight),
      );
      canvas.width = Math.round(source.videoWidth * scale);
      canvas.height = Math.round(source.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture photo");
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (currentRequest !== request.current) return;
      if (!blob) throw new Error("Could not capture photo");
      setPhoto(new File([blob], "mission-proof.jpg", { type: "image/jpeg" }));
      if (upload.current) upload.current.value = "";
      closeCamera();
    } catch {
      if (currentRequest !== request.current) return;
      setError("The photo could not be captured. Try again or choose a photo.");
      setCapturing(false);
    }
  }

  return (
    <form
      action={async (data) => {
        if (photo) data.set("photo", photo);
        closeCamera();
        await mutate(data);
      }}
    >
      <input type="hidden" name="action" value="photo" />
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <label>
        Photo proof · choose a photo
        <input
          ref={upload}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!photo}
          onChange={() => {
            if (!upload.current?.files?.length) return;
            setPhoto(null);
            setError("");
            closeCamera();
          }}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        onClick={openCamera}
        disabled={cameraOpen}
      >
        <Camera size={17} /> {photo ? "Retake photo" : "Take photo"}
      </button>
      {cameraOpen && (
        <div className="camera-panel">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Camera preview"
          />
          {!ready && <p role="status">Opening camera…</p>}
          <div className="button-row">
            <button
              type="button"
              className="button"
              onClick={capturePhoto}
              disabled={!ready || capturing}
            >
              {capturing ? "Capturing…" : "Capture photo"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={closeCamera}
            >
              Cancel camera
            </button>
          </div>
        </div>
      )}
      {preview && !cameraOpen && (
        <div className="photo-preview">
          <img src={preview} alt="Your captured mission proof" />
          <p role="status">Photo ready to submit.</p>
        </div>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="footnote">
        JPG, PNG, or WebP · up to 8 MB. One photo completes the mission for your
        whole group.
      </p>
      <label className="check-label">
        <input type="checkbox" name="consent" value="yes" required />I have
        permission to share this photo and agree to send it to Google Gemini for
        review. It stays private to me and Chambana reviewers. I understand that
        Chambana keeps the photo and its record in a private archive even if the
        group is deleted.
      </label>
      <SubmitButton disabled={cameraOpen} />
    </form>
  );
}
