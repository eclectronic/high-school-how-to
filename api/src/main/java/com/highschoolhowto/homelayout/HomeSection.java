package com.highschoolhowto.homelayout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "home_sections")
public class HomeSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int sortOrder;

    private String layout;

    @Column(name = "slot1_tag")
    private String slot1Tag;

    @Column(name = "slot2_tag")
    private String slot2Tag;

    public Long getId() { return id; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public String getLayout() { return layout; }
    public void setLayout(String layout) { this.layout = layout; }

    public String getSlot1Tag() { return slot1Tag; }
    public void setSlot1Tag(String slot1Tag) { this.slot1Tag = slot1Tag; }

    public String getSlot2Tag() { return slot2Tag; }
    public void setSlot2Tag(String slot2Tag) { this.slot2Tag = slot2Tag; }
}
