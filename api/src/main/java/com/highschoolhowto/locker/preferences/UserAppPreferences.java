package com.highschoolhowto.locker.preferences;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_app_preferences")
public class UserAppPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "active_apps", nullable = false, columnDefinition = "TEXT")
    private String activeApps;

    @Column(name = "pane_order", columnDefinition = "TEXT")
    private String paneOrder;

    @Column(name = "palette_name", nullable = false, length = 50)
    private String paletteName;

    @Column(name = "locker_color", length = 20)
    private String lockerColor;

    @Column(name = "font_family", length = 50)
    private String fontFamily;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getActiveApps() {
        return activeApps;
    }

    public void setActiveApps(String activeApps) {
        this.activeApps = activeApps;
    }

    public String getPaneOrder() {
        return paneOrder;
    }

    public void setPaneOrder(String paneOrder) {
        this.paneOrder = paneOrder;
    }

    public String getPaletteName() {
        return paletteName;
    }

    public void setPaletteName(String paletteName) {
        this.paletteName = paletteName;
    }

    public String getLockerColor() {
        return lockerColor;
    }

    public void setLockerColor(String lockerColor) {
        this.lockerColor = lockerColor;
    }

    public String getFontFamily() {
        return fontFamily;
    }

    public void setFontFamily(String fontFamily) {
        this.fontFamily = fontFamily;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
