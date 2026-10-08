import { CompanyBoard } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function CompaniesPage() {
  const user = await requireUser();
  const companies = await prisma.targetCompany.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader eyebrow="Targets" title="Companies" lede="A board for firms you are researching, not only roles that happen to be posted." />
      <CompanyBoard
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
          industry: company.industry,
          location: company.location,
          status: company.status,
          notes: company.notes,
          website: company.website,
          problems: parseJson(company.problems, []),
        }))}
      />
    </div>
  );
}
