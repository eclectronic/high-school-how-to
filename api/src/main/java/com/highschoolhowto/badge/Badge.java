package com.highschoolhowto.badge;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "badges",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_badge_trigger",
                columnNames = {"trigger_type", "trigger_param"}))
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 10)
    private String emoji;

    @Column(name = "icon_url", length = 2000)
    private String iconUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 50)
    private BadgeTriggerType triggerType;

    @Column(name = "trigger_param", length = 255)
    private String triggerParam;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    public String getIconUrl() { return iconUrl; }
    public void setIconUrl(String iconUrl) { this.iconUrl = iconUrl; }

    public BadgeTriggerType getTriggerType() { return triggerType; }
    public void setTriggerType(BadgeTriggerType triggerType) { this.triggerType = triggerType; }

    public String getTriggerParam() { return triggerParam; }
    public void setTriggerParam(String triggerParam) { this.triggerParam = triggerParam; }

    public Instant getCreatedAt() { return createdAt; }
}
