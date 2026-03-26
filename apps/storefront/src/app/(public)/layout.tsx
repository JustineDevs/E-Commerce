import {
  loadCmsAbExperimentsActivePublic,
  loadCmsAnnouncementPublic,
  loadCmsNavigationPublic,
} from "@apparel-commerce/platform-data";
import { GlobalRouteMotion } from "../../components/GlobalRouteMotion";
import { CmsAnnouncementBar } from "../../components/CmsAnnouncementBar";
import { CmsExperimentAssigner } from "../../components/CmsExperimentAssigner";
import { StorefrontFooter } from "../../components/StorefrontFooter";
import { StorefrontHeader } from "../../components/StorefrontHeader";

function announcementInWindow(
  body: string,
  startsAt: string | null,
  endsAt: string | null,
): boolean {
  if (!body.trim()) return false;
  const now = Date.now();
  if (startsAt && new Date(startsAt).getTime() > now) return false;
  if (endsAt && new Date(endsAt).getTime() < now) return false;
  return true;
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [nav, announcement, experiments] = await Promise.all([
    loadCmsNavigationPublic(),
    loadCmsAnnouncementPublic(),
    loadCmsAbExperimentsActivePublic(),
  ]);

  const ann = announcement;
  const showAnnouncement =
    !!ann && announcementInWindow(ann.body, ann.startsAt, ann.endsAt);

  return (
    <>
      <StorefrontHeader
        announcement={
          showAnnouncement && ann ? (
            <CmsAnnouncementBar
              body={ann.body}
              linkUrl={ann.linkUrl}
              linkLabel={ann.linkLabel}
              dismissible={ann.dismissible}
            />
          ) : undefined
        }
        mainNavItems={nav.headerLinks.length > 0 ? nav.headerLinks : undefined}
      />
      <CmsExperimentAssigner experiments={experiments} />
      <div className="mx-auto w-full min-w-0 max-w-[100vw] pt-[5.875rem] xs:pt-24 sm:pt-[6.125rem] md:pt-[6.25rem]">
        <GlobalRouteMotion>{children}</GlobalRouteMotion>
      </div>
      <StorefrontFooter
        cmsFooterColumns={nav.footerColumns.length > 0 ? nav.footerColumns : undefined}
        cmsSocialLinks={nav.socialLinks.length > 0 ? nav.socialLinks : undefined}
      />
    </>
  );
}
