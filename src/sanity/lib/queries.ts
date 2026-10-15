export const homepageHeroQuery = `*[_type == "homepageHero" && _id == "homepageHero"][0]{
  titleText,
  supportText,
  videoUrl,
  watchUrl,
  stampHint,
  // Prefer Sanity image assets (cdn.sanity.io) so GitHub Pages can load them.
  "posterUrl": coalesce(poster.asset->url, posterUrl),
  "imageUrl": coalesce(backgroundImage.asset->url, imageUrl),
  "posterAssetId": poster.asset->_id,
  "imageAssetId": backgroundImage.asset->_id
}`;

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
    rowStart,
    rowSpan,
    sectionRows,
    hidden,
    featured,
    fill,
    label,
    headline,
    subtitle,
    excerpt,
    meta,
    title,
    year,
    summary,
    caption,
    description,
    href,
    imageSrc,
    imageAlt,
    placeholderTone,
    layouts{
      tablet{ colStart, colSpan, rowStart, rowSpan, order },
      mobile{ colStart, colSpan, rowStart, rowSpan, order }
    },
    "id": coalesce(id, _key),
    projectRef->{
      title,
      "slug": slug.current,
      summary,
      year,
      url
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
