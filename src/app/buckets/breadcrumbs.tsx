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
    bucketId?: string;
    sourceId?: string;
    deploymentId?: string;
  }>();
  const pathname = usePathname();

  if (!params.bucketId) {
    return (
      <Breadcrumb>
        <BreadcrumbList className="h-16">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbPage>Buckets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (params.sourceId || params.deploymentId) {
    return (
      <Breadcrumb>
        <BreadcrumbList className="h-16">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink href="/buckets">Buckets</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink href={`/buckets/${params.bucketId}`}>
              {params.bucketId}
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          {params.sourceId ? (
            <BreadcrumbItem>
              <BreadcrumbLink href={`/buckets/${params.bucketId}/sources/`}>
                Sources
              </BreadcrumbLink>
            </BreadcrumbItem>
          ) : params.deploymentId ? (
            <BreadcrumbItem>
              <BreadcrumbLink href={`/buckets/${params.bucketId}/deployments/`}>
                Deployments
              </BreadcrumbLink>
            </BreadcrumbItem>
          ) : null}

          <BreadcrumbSeparator />

          {params.sourceId ? (
            <BreadcrumbItem>
              <BreadcrumbPage>{params.sourceId}</BreadcrumbPage>
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
          <BreadcrumbLink href="/buckets">Buckets</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {pathname.includes("/sources") ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/buckets/${params.bucketId}`}>
                {params.bucketId}
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <div className="flex flex-col items-center">
              <BreadcrumbItem>
                <BreadcrumbPage>Sources</BreadcrumbPage>
              </BreadcrumbItem>
              <Separator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/buckets/${params.bucketId}/deployments`}
                >
                  Deployments
                </BreadcrumbLink>
              </BreadcrumbItem>
            </div>
          </>
        ) : pathname.includes("/deployments") ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/buckets/${params.bucketId}`}>
                {params.bucketId}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            <div className="flex flex-col items-center">
              <BreadcrumbItem>
                <BreadcrumbLink href={`/buckets/${params.bucketId}/sources`}>
                  Sources
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
              <BreadcrumbPage>{params.bucketId}</BreadcrumbPage>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <div className="flex flex-col items-center">
              <BreadcrumbItem>
                <BreadcrumbLink href={`/buckets/${params.bucketId}/sources`}>
                  Sources
                </BreadcrumbLink>
              </BreadcrumbItem>
              <Separator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/buckets/${params.bucketId}/deployments`}
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
