package com.highschoolhowto.content.card;

import com.highschoolhowto.content.tag.Tag;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "content_cards")
public class ContentCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 50)
    private CardType cardType;

    @Column(name = "media_url", length = 2000)
    private String mediaUrl;

    @Column(name = "print_media_url", length = 2000)
    private String printMediaUrl;

    @Column(name = "thumbnail_url", length = 2000)
    private String thumbnailUrl;

    @Column(name = "cover_image_url", length = 2000)
    private String coverImageUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "media_urls", columnDefinition = "jsonb")
    private List<MediaUrlEntry> mediaUrls = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "body_json", columnDefinition = "jsonb")
    private String bodyJson;

    @Column(name = "body_html", columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "background_color", length = 20)
    private String backgroundColor;

    @Column(name = "text_color", length = 20)
    private String textColor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CardStatus status = CardStatus.DRAFT;

    @Column(name = "simple_layout", nullable = false)
    private boolean simpleLayout = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToMany
    @JoinTable(
            name = "content_card_tags",
            joinColumns = @JoinColumn(name = "card_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private List<Tag> tags = new ArrayList<>();

    @OneToMany(mappedBy = "sourceCard", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Fetch(FetchMode.SUBSELECT)
    private List<ContentCardLink> links = new ArrayList<>();

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Fetch(FetchMode.SUBSELECT)
    private List<ContentCardTask> templateTasks = new ArrayList<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getPrintMediaUrl() { return printMediaUrl; }
    public void setPrintMediaUrl(String printMediaUrl) { this.printMediaUrl = printMediaUrl; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public List<MediaUrlEntry> getMediaUrls() { return mediaUrls != null ? mediaUrls : new ArrayList<>(); }
    public void setMediaUrls(List<MediaUrlEntry> mediaUrls) { this.mediaUrls = mediaUrls != null ? mediaUrls : new ArrayList<>(); }

    public String getBodyJson() { return bodyJson; }
    public void setBodyJson(String bodyJson) { this.bodyJson = bodyJson; }

    public String getBodyHtml() { return bodyHtml; }
    public void setBodyHtml(String bodyHtml) { this.bodyHtml = bodyHtml; }

    public String getBackgroundColor() { return backgroundColor; }
    public void setBackgroundColor(String backgroundColor) { this.backgroundColor = backgroundColor; }

    public String getTextColor() { return textColor; }
    public void setTextColor(String textColor) { this.textColor = textColor; }

    public CardStatus getStatus() { return status; }
    public void setStatus(CardStatus status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public boolean isSimpleLayout() { return simpleLayout; }
    public void setSimpleLayout(boolean simpleLayout) { this.simpleLayout = simpleLayout; }

    public List<Tag> getTags() { return tags; }
    public void setTags(List<Tag> tags) { this.tags = tags; }

    public List<ContentCardLink> getLinks() { return links; }
    public void setLinks(List<ContentCardLink> links) { this.links = links; }

    public List<ContentCardTask> getTemplateTasks() { return templateTasks; }
    public void setTemplateTasks(List<ContentCardTask> templateTasks) { this.templateTasks = templateTasks; }
}
