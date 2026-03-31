import {
  loadCmsAbExperimentsActivePublic,
  loadCmsAnnouncementsPublic,
  loadCmsNavigationPublic,
} from "@apparel-commerce/platform-data";
import { CmsAnnouncementStack } from "./CmsAnnouncementBar";
import { CmsExperimentAssigner } from "./CmsExperimentAssigner";
import { GlobalRouteMotion } from "./GlobalRouteMotion";
import { StorefrontFooter } from "./StorefrontFooter";
import { StorefrontHeader } from "./StorefrontHeader";
import { getCachedPublicSiteMetadata } from "@/lib/public-site-metadata";

/**
 * Shared storefront chrome (header, footer, motion, CMS experiments) for public routes
 * and root not-found so global 404s still match the main layout.
 */
export async function StorefrontPublicChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const [nav, announcements, experiments, publicSite] = await Promise.all([
    loadCmsNavigationPublic(),
    loadCmsAnnouncementsPublic(),
    loadCmsAbExperimentsActivePublic(),
    getCachedPublicSiteMetadata(),
  ]);

  const announcementBars = announcements.map((ann) => ({
    id: ann.id,
    locale: ann.locale,
    body: ann.body,
    bodyFormat: ann.bodyFormat,
    linkUrl: ann.linkUrl,
    linkLabel: ann.linkLabel,
    dismissible: ann.dismissible,
  }));

  return (
    <>
      <StorefrontHeader
        announcement={
          announcementBars.length > 0 ? <CmsAnnouncementStack bars={announcementBars} /> : undefined
        }
        navigation={nav}
      />
      <CmsExperimentAssigner experiments={experiments} />
      <div className="mx-auto w-full min-w-0 max-w-[100vw] pt-[5.875rem] xs:pt-24 sm:pt-[6.125rem] md:pt-[6.25rem]">
        <GlobalRouteMotion>{children}</GlobalRouteMotion>
      </div>
      <StorefrontFooter
        cmsFooterColumns={nav.footerColumns.length > 0 ? nav.footerColumns : undefined}
        cmsFooterBottomLinks={
          nav.footerBottomLinks.length > 0 ? nav.footerBottomLinks : undefined
        }
        cmsSocialLinks={nav.socialLinks.length > 0 ? nav.socialLinks : undefined}
        instagramUrlRaw={publicSite.instagramUrl}
      />
    </>
  );
}
