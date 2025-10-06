"use client";

import { useParams, usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export default function Breadcrumbs() {
  const params = useParams<{
    projectId?: string;
    documentId?: string;
    deploymentId?: string;
  }>();
  const pathname = usePathname();

  if (!params.projectId) {
    return (
      <Breadcrumb>
        <BreadcrumbList className="h-16">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage>Projects</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (params.documentId || params.deploymentId) {
    return (
      <Breadcrumb>
        <BreadcrumbList className="h-16">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${params.projectId}`}>
              {params.projectId}
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          {params.documentId ? (
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${params.projectId}/documents/`}>
                Documents
              </BreadcrumbLink>
            </BreadcrumbItem>
          ) : params.deploymentId ? (
            <BreadcrumbItem>
              <BreadcrumbLink
                href={`/projects/${params.projectId}/deployments/`}
              >
                Deployments
              </BreadcrumbLink>
            </BreadcrumbItem>
          ) : null}

          <BreadcrumbSeparator />

          {params.documentId ? (
            <BreadcrumbItem>
              <BreadcrumbPage>{params.documentId}</BreadcrumbPage>
            </BreadcrumbItem>
          ) : params.deploymentId ? (
            <BreadcrumbItem>
              <BreadcrumbPage>{params.deploymentId}</BreadcrumbPage>
            </BreadcrumbItem>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="h-16">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {pathname.includes("/documents") ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${params.projectId}`}>
                {params.projectId}
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <div className="flex flex-col items-center">
              <BreadcrumbItem>
                <BreadcrumbPage>Documents</BreadcrumbPage>
              </BreadcrumbItem>
              <Separator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/projects/${params.projectId}/deployments`}
                >
                  Deployments
                </BreadcrumbLink>
              </BreadcrumbItem>
            </div>
          </>
        ) : pathname.includes("/deployments") ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${params.projectId}`}>
                {params.projectId}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            <div className="flex flex-col items-center">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/projects/${params.projectId}/documents`}
                >
                  Documents
                </BreadcrumbLink>
              </BreadcrumbItem>
              <Separator />
              <BreadcrumbItem>
                <BreadcrumbPage>Deployments</BreadcrumbPage>
              </BreadcrumbItem>
            </div>
          </>
        ) : (
          <>
            <BreadcrumbItem>
              <BreadcrumbPage>{params.projectId}</BreadcrumbPage>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <div className="flex flex-col items-center">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/projects/${params.projectId}/documents`}
                >
                  Documents
                </BreadcrumbLink>
              </BreadcrumbItem>
              <Separator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/projects/${params.projectId}/deployments`}
                >
                  Deployments
                </BreadcrumbLink>
              </BreadcrumbItem>
            </div>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
