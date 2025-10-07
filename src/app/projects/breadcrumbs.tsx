"use client";

import { useParams, usePathname } from "next/navigation";
import React from "react";
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
    path?: string[];
  }>();
  const pathname = usePathname();
  const path = React.useMemo(() => {
    if (!params.path) return [];
    return params.path.map(decodeURIComponent);
  }, [params.path]);

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

  if (
    params.documentId ||
    params.deploymentId ||
    (path && pathname.includes("/documents/"))
  ) {
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

          {params.documentId || pathname.includes("/documents") ? (
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

          {path &&
            path.length > 0 &&
            path.map((segment, index, arr) => {
              if (segment.startsWith("doc:")) {
                return (
                  <div key={segment} className="flex items-center">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{segment.slice(4)}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </div>
                );
              }

              const isLast = index === arr.length - 1;
              const path = arr.slice(0, index + 1).join("/");
              const href = `/projects/${params.projectId}/documents/${path}`;

              return (
                <div key={segment} className="flex items-center">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{segment}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{segment}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              );
            })}

          {params.documentId && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{params.documentId}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}

          {params.deploymentId && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{params.deploymentId}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
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
