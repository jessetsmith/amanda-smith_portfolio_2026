export const homepageQuery = `*[_type == "homepage" && _id == "homepage"][0]{
  introMaskText,
  introSupport,
  introVideoUrl,
  introPosterUrl,
  gridItems[]{
    kind,
    order,
    colStart,
    colSpan,
    rowSpan,
    fill,
    label,
    headline,
    excerpt,
    meta,
    title,
    year,
    summary,
    caption,
    placeholderTone,
    "id": _key,
    projectRef->{
      title,
      "slug": slug.current,
      summary,
      year
    }
  }
}`;

export const siteSettingsQuery = `*[_type == "siteSettings" && _id == "siteSettings"][0]{
  siteTitle,
  nav[]{ label, href },
  contactEmail,
  contactNote
}`;

export const cvQuery = `*[_type == "cv" && _id == "cv"][0]{
  name,
  headline,
  phone,
  email,
  location,
  relocationNote,
  expertiseTags,
  expertiseHighlights[]{ text },
  experience[]{
    title, org, location, startDate, endDate, current, summary, bullets
  },
  awards[]{ title, org, location, date, description },
  speaking[]{ role, eventTitle, org, location, date, description },
  education[]{
    credentialType, title, institution, location, startYear, endYear, notes
  },
  technicalSkills,
  languages[]{ language, level },
  publications[]{ title, venue, date, url }
}`;
