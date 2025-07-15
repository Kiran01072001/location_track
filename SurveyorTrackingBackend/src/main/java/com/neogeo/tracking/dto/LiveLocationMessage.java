package com.neogeo.tracking.dto;

import java.time.Instant;
import java.util.Objects;

public class LiveLocationMessage {
    private String surveyorId;
    private double latitude;
    private double longitude;
    private Instant timestamp;

    public LiveLocationMessage() {
    }

    public LiveLocationMessage(String surveyorId, double latitude, double longitude, Instant timestamp) {
        this.surveyorId = surveyorId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    // Getters and Setters
    public String getSurveyorId() {
        return surveyorId;
    }

    public void setSurveyorId(String surveyorId) {
        this.surveyorId = surveyorId;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "LiveLocationMessage{" +
                "surveyorId='" + surveyorId + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", timestamp=" + timestamp +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        LiveLocationMessage that = (LiveLocationMessage) o;
        return Double.compare(that.latitude, latitude) == 0 &&
                Double.compare(that.longitude, longitude) == 0 &&
                Objects.equals(surveyorId, that.surveyorId) &&
                Objects.equals(timestamp, that.timestamp);
    }

    @Override
    public int hashCode() {
        return Objects.hash(surveyorId, latitude, longitude, timestamp);
    }
}