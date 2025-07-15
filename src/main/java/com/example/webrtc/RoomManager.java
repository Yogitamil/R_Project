package com.example.webrtc;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;

@Component
public class RoomManager {

    private final Map<String, List<WebSocketSession>> rooms = new HashMap<>();

    public synchronized void joinRoom(String roomId, WebSocketSession session) {
        rooms.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
    }

    public synchronized void leaveRoom(String roomId, WebSocketSession session) {
        List<WebSocketSession> participants = rooms.get(roomId);
        if (participants != null) {
            participants.remove(session);
            if (participants.isEmpty()) {
                rooms.remove(roomId);
            }
        }
    }

    public synchronized List<WebSocketSession> getOtherParticipants(String roomId, WebSocketSession sender) {
        List<WebSocketSession> all = rooms.getOrDefault(roomId, new ArrayList<>());
        List<WebSocketSession> others = new ArrayList<>(all);
        others.remove(sender);
        return others;
    }

    public synchronized String getRoomIdBySession(WebSocketSession session) {
        return rooms.entrySet().stream()
            .filter(e -> e.getValue().contains(session))
            .map(Map.Entry::getKey)
            .findFirst()
            .orElse(null);
    }
}
