package com.highschoolhowto.content.card;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "content_card_links",
        uniqueConstraints =
                @UniqueConstraint(columnNames = {"source_card_id", "target_card_id"}))
public class ContentCardLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_card_id", nullable = false)
    private ContentCard sourceCard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_card_id", nullable = false)
    private ContentCard targetCard;

    @Column(name = "link_text", length = 500)
    private String linkText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public ContentCard getSourceCard() {
        return sourceCard;
    }

    public void setSourceCard(ContentCard sourceCard) {
        this.sourceCard = sourceCard;
    }

    public ContentCard getTargetCard() {
        return targetCard;
    }

    public void setTargetCard(ContentCard targetCard) {
        this.targetCard = targetCard;
    }

    public String getLinkText() {
        return linkText;
    }

    public void setLinkText(String linkText) {
        this.linkText = linkText;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
