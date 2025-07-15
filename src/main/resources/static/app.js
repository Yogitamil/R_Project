let socket;
let roomId;
let localStream;
let peerConnection;
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

document.getElementById("joinBtn").onclick = async () => {
  roomId = document.getElementById("roomInput").value.trim();
  if (!roomId) {
    alert("Enter a valid Room ID.");
    return;
  }

  await startLocalStream();
  connectToWebSocket();

  document.getElementById("joinBtn").disabled = true;
  document.getElementById("leaveBtn").style.display = "inline-block";
};

document.getElementById("leaveBtn").onclick = () => {
  leaveRoom();
};

document.getElementById("copyLinkBtn").onclick = () => {
  const room = document.getElementById("roomInput").value.trim();
  if (!room) {
    alert("Enter Room ID first.");
    return;
  }

  const url = `${window.location.origin}?room=${room}`;
  navigator.clipboard.writeText(url);
  alert("Invite link copied:\n" + url);
};

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get("room");
  if (room) {
    document.getElementById("roomInput").value = room;
    document.getElementById("joinBtn").click();
  }
};

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    const localVideo = document.getElementById("localVideo");
    localVideo.srcObject = localStream;
    localVideo.muted = true;
    localVideo.play();
    console.log("Local media stream started.");
  } catch (error) {
    console.error("Media access error:", error);
    alert("Could not access camera or microphone.");
  }
}

function connectToWebSocket() {
  socket = new WebSocket("wss://r-project-yx0q.onrender.com/signal");

  socket.onopen = () => {
    console.log("WebSocket connected.");
    socket.send(JSON.stringify({
      type: "join",
      room: roomId
    }));
    document.getElementById("status").innerText = `Joined room: ${roomId}`;
  };

  socket.onmessage = async (msg) => {
    const data = JSON.parse(msg.data);
    console.log("Received:", data);

    if (data.type === "notification") {
      document.getElementById("status").innerText = data.message;

      if (data.message.includes("joined")) {
        sendOffer();
      }

      if (data.message.includes("left")) {
        document.getElementById("status").innerText = data.message;
        if (peerConnection) {
          peerConnection.close();
          peerConnection = null;
        }
        document.getElementById("remoteVideo").srcObject = null;
      }

      return;
    }

    const signal = data;

    if (signal.type === "offer") {
      createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.send(JSON.stringify({
        type: "signal",
        data: {
          type: "answer",
          sdp: answer
        }
      }));
    } else if (signal.type === "answer") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === "ice-candidate") {
      try {
        await peerConnection.addIceCandidate(signal.candidate);
      } catch (e) {
        console.error("Error adding received ICE candidate", e);
      }
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    console.log("WebSocket closed.");
  };
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.play();
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({
        type: "signal",
        data: {
          type: "ice-candidate",
          candidate: event.candidate
        }
      }));
    }
  };
}

async function sendOffer() {
  createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.send(JSON.stringify({
    type: "signal",
    data: {
      type: "offer",
      sdp: offer
    }
  }));
}

function leaveRoom() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "leave",
      room: roomId
    }));
    socket.close();
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  document.getElementById("status").innerText = "You left the room.";
  document.getElementById("localVideo").srcObject = null;
  document.getElementById("remoteVideo").srcObject = null;

  document.getElementById("joinBtn").disabled = false;
  document.getElementById("leaveBtn").style.display = "none";
}
