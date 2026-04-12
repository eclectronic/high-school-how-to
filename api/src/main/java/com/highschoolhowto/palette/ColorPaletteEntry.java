package com.highschoolhowto.palette;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "color_palette_entry")
public class ColorPaletteEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private short position;

    @Column(nullable = false, length = 200)
    private String color;

    public Long getId() { return id; }

    public short getPosition() { return position; }
    public void setPosition(short position) { this.position = position; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
