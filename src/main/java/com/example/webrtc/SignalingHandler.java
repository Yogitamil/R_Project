package com.example.webrtc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;

@Component
public class SignalingHandler extends TextWebSocketHandler {

    private final RoomManager roomManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SignalingHandler(RoomManager roomManager) {
        this.roomManager = roomManager;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {}

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        JsonNode json = objectMapper.readTree(message.getPayload());
        String type = json.get("type").asText();

        switch (type) {
            case "join":
                String roomId = json.get("room").asText();
                roomManager.joinRoom(roomId, session);
                notifyUsersInRoom(roomId, session, "User joined");
                break;

            case "signal":
                handleSignal(json, session);
                break;
        }
    }

    private void handleSignal(JsonNode json, WebSocketSession sender) throws IOException {
        String roomId = roomManager.getRoomIdBySession(sender);
        if (roomId == null) return;

        List<WebSocketSession> others = roomManager.getOtherParticipants(roomId, sender);
        for (WebSocketSession peer : others) {
            if (peer.isOpen()) {
                peer.sendMessage(new TextMessage(json.get("data").toString()));
            }
        }
    }

    private void notifyUsersInRoom(String roomId, WebSocketSession sender, String message) throws IOException {
        List<WebSocketSession> others = roomManager.getOtherParticipants(roomId, sender);
        for (WebSocketSession peer : others) {
            if (peer.isOpen()) {
                peer.sendMessage(new TextMessage("{\"type\": \"notification\", \"message\": \"" + message + "\"}"));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = roomManager.getRoomIdBySession(session);
        if (roomId != null) {
            roomManager.leaveRoom(roomId, session);
        }
    }
}
