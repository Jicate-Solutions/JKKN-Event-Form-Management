````md
# Full-Stack Module Development Flow

This guide demonstrates a standardized approach for building new modules in a full-stack application using:

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- **[shadcn/ui](https://ui.shadcn.com/)** (optional UI components)
- **[Supabase](https://supabase.com/)**
- **[Zod](https://github.com/colinhacks/zod)** (validation)
- **[React Query](https://tanstack.com/query/v4)** (data fetching & caching)
- **RLS (Row-Level Security)** in Supabase

We’ll walk through an example “Institution” module from **domain types** to **service logic**, **validation**, **React Query integration**, and **UI components**. Adjust the specifics (field names, table names, etc.) to suit your real-world needs.

---

## 1. Define Domain Types & Zod Schemas

First, create your TypeScript domain types (e.g., in `types/organization.ts`) and corresponding Zod schemas for validation. This ensures your data structures are typed and validated before reaching your database.

```ts
// types/organization.ts

import { z } from "zod";

// Domain model for an Institution
export interface Institution {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  // ... plus extra fields like "email", "phone", etc.
}

// Zod: CreateInstitution schema
export const createInstitutionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
  logo_url: z.string().optional(),
  // Additional fields & validations...
});

// Zod: UpdateInstitution schema (partial)
export const updateInstitutionSchema = createInstitutionSchema.partial();

// Derived types for your service methods
export type CreateInstitutionDto = z.infer<typeof createInstitutionSchema>;
export type UpdateInstitutionDto = z.infer<typeof updateInstitutionSchema>;

// Additional types for filters or metadata
export interface InstitutionFilters {
  search?: string;
  isActive?: boolean;
  // ... other filter fields
}
````

**Key Points**:

- We’re using **Zod** for schema validation.
- We export both the Zod schemas (`createInstitutionSchema`, `updateInstitutionSchema`) **and** TypeScript types (`CreateInstitutionDto`, `UpdateInstitutionDto`) to ensure consistency across our codebase.

---

## 2. RLS Policy Considerations (Supabase)

1. In your Supabase dashboard, create a table named `institutions` with columns:

   - `id` (uuid) – primary key (default value: `uuid_generate_v4()`)
   - `name` (text)
   - `code` (text)
   - `logo_url` (text, optional)
   - Any additional columns you need.

2. **Enable RLS (Row-Level Security)**:

   - In the Supabase dashboard, go to `Auth` → `Policies`.
   - Enable RLS for the `institutions` table.

3. **Create RLS Policies** according to your app’s requirements:
   - For example, let any authenticated user read all institutions:
     ```sql
     CREATE POLICY "Allow authenticated read"
     ON public.institutions
     FOR SELECT
     TO authenticated
     USING (true);
     ```
   - For create/update/delete, you might limit actions to users with certain roles or conditions. For instance, if you store a `user_id` on each row:
     ```sql
     CREATE POLICY "Allow row owner insert"
     ON public.institutions
     FOR INSERT
     TO authenticated
     WITH CHECK (auth.uid() = user_id);
     ```
   - Adjust these policies to match your real-world authorization model.

**Important**: This guide won’t delve too deep into RLS details, but always test that your RLS policies align with your intended security model.

---

## 3. Implement the Service Layer

Encapsulate all business logic and database operations in a dedicated service class. This ensures the rest of the application only interacts with a clean, well-defined API, hiding Supabase details.

```ts
// lib/services/organization/organization-service.ts

import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import type {
  Institution,
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from "@/types/organizations";
import {
  createInstitutionSchema,
  updateInstitutionSchema,
} from "@/types/organizations";

export class OrganizationService {
  private static supabase = getSupabaseClient();

  // Create
  static async createInstitution(data: CreateInstitutionDto): Promise<Institution> {
    const parsed = createInstitutionSchema.parse(data);
    try {
      const { data: institution, error } = await this.supabase
        .from("institutions")
        .insert(parsed)
        .single();

      if (error) throw error;
      toast.success("Institution created successfully");
      return institution as Institution;
    } catch (err: any) {
      toast.error(err.message || "Failed to create institution");
      throw err;
    }
  }

  // Read all
  static async getInstitutions(): Promise<Institution[]> {
    try {
      const { data, error } = await this.supabase
        .from("institutions")
        .select("*");
      if (error) throw error;
      return data as Institution[];
    } catch (err) {
      throw err;
    }
  }

  // Read one
  static async getInstitution(id: string): Promise<Institution> {
    try {
      const { data, error } = await this.supabase
        .from("institutions")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Institution;
    } catch (err) {
      throw err;
    }
  }

  // Update
  static async updateInstitution(id: string, data: UpdateInstitutionDto): Promise<Institution> {
    const parsed = updateInstitutionSchema.parse(data);
    try {
      const { data: institution, error } = await this.supabase
        .from("institutions")
        .update(parsed)
        .eq("id", id)
        .single();
      if (error) throw error;
      toast.success("Institution updated successfully");
      return institution as Institution;
    } catch (err: any) {
      toast.error(err.message || "Failed to update institution");
      throw err;
    }
  }

  // Delete
  static async deleteInstitution(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("institutions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Institution deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete institution");
      throw err;
    }
  }

  // Example "checkCodeExists" function:
  static async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.supabase.from("institutions").select("id").eq("code", code);
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      const { data, error } = await query.single();
      if (error && error.code !== "PGRST116") throw error;
      return !!data; // If we got data back, it means the code exists
    } catch (err) {
      console.error("Error checking code:", err);
      return false;
    }
  }
}
```

**Notes**:

- `getSupabaseClient()` uses your custom client code in lib/supabase/client.ts.
- RLS protects data on the database side. Your Zod validation ensures correct shape of data before insertion/update.
- For server-side usage (e.g., within Next.js Server Components or API endpoints), you might prefer `createServerSupabaseClient()` from lib/supabase/server.ts instead.

---

## 4. Create React Query Hooks

Instead of manually managing `useState` for loading/errors, we use **React Query** to handle caching, refetching, and state management. Make sure you have React Query set up (e.g., a `<QueryClientProvider>` at the root of your app). (e.g., in app/layout.tsx).

### 4.1. Hook for Fetching All Institutions

```ts
/// hooks/organization/use-institutions.ts

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrganizationService } from "@/lib/services/organization/organization-service";
import type { InstitutionFilters } from "@/types/organizations";

export function useInstitutions() {
  const [filters, setFilters] = useState<InstitutionFilters>({});
  const [page, setPage] = useState(1);

  // Example metadata for pagination, total count, etc.
  const [metadata, setMetadata] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const {
    data: institutions,
    isLoading: loading,
    error,
    refetch: fetchInstitutions,
  } = useQuery({
    queryKey: ["institutions", filters, page],
    queryFn: async () => {
      // This is a simplistic example:
      const data = await OrganizationService.getInstitutions();
      // You could apply filters or pagination on the server side
      // For demonstration, we just return all
      return data;
    },
  });

  const updateFilters = (newFilters: Partial<InstitutionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const changePage = (newPage: number) => {
    setPage(newPage);
  };

  return {
    institutions: institutions || [],
    loading,
    error: error ? (error as Error).message : null,
    metadata,
    filters,
    updateFilters,
    changePage,
    fetchInstitutions,
  };
}
```

- **queryKey**: Identifies the resource in the cache (e.g., `["institutions"]`).
- **queryFn**: The actual fetch logic from our service.

### 4.2. Hook for Creating an Institution

You can create similar hooks for createInstitution, updateInstitution, etc. using useMutation.

```ts
// hooks/organization/useCreateInstitution.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OrganizationService } from "@/lib/services/organization/organization-service";
import { CreateInstitutionDto } from "@/types/organization";

export function useCreateInstitution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInstitutionDto) =>
      OrganizationService.createInstitution(data),
    onSuccess: () => {
      // Invalidate the "institutions" query to refetch fresh data
      queryClient.invalidateQueries(["institutions"]);
    },
  });
}
```

**Similarly**, create `useUpdateInstitution` and `useDeleteInstitution` hooks as needed.

---

# Build the UI Components (Using shadcn/ui)

Below is a reference implementation of various Next.js client components using the **[shadcn/ui](https://ui.shadcn.com/)** library along with Tailwind CSS. These examples demonstrate how you can structure pages, forms, tables, dialogs, and other UI elements for a full-featured “Institutions” module. Adapt or extend them to suit your exact domain and styling needs.

### 5.1. Listing Institutions

```tsx
## 1. Institutions List Page

The main “Institutions” list page displays a list of existing institutions, provides a search/filter UI, and includes buttons for bulk uploading, downloading templates, and adding a new institution.

``tsx

// app/(routes)/organizations/institutions/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { Button } from "@/components/ui/button";
import { useInstitutions } from "@/hooks/organization/use-institutions";
import { Card, CardContent } from "@/components/ui/card";
import { BeatLoader } from "react-spinners"; // or any spinner you prefer
import { InstitutionList } from "./_components/institution-list";
import { InstitutionFilter } from "./_components/institution-filters";
import BulkUploadInstitutions from "./_components/bulk-upload-institutions";
import DownloadTemplateButton from "./_components/download-template-button";
import Breadcrumbs from '@/components/layout/breadcrumb';

export default function InstitutionsPage() {
  const {
    institutions,
    loading,
    error,
    metadata,
    filters,
    updateFilters,
    changePage,
    fetchInstitutions
  } = useInstitutions();

  useEffect(() => {
    // Initial load
    fetchInstitutions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <ContentLayout title="Institutions">
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => fetchInstitutions()} className="mt-4">
            Try Again
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Institutions">
      <Breadcrumbs
        items={[
          { label: 'Home', link: '/' },
          { label: 'Institutions', link: '#' }
        ]}
      />


      <div className="space-y-6 mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-2xl font-bold py-1">Institutions</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your educational institutions
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <DownloadTemplateButton />
            <BulkUploadInstitutions />
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/organizations/institutions/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Institution
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <InstitutionFilter filters={filters} onFilterChange={updateFilters} />

            {loading ? (
              <div className="flex justify-center items-center p-8">
                <BeatLoader color="#00e902" />
              </div>
            ) : (
              <InstitutionList
                institutions={institutions}
                metadata={metadata}
                onPageChange={changePage}
                onRefresh={fetchInstitutions}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
```

2. Create New Institution Page
   When a user clicks “Add Institution,” this page displays an InstitutionForm for creating a new record.

```tsx

// app/(routes)/organizations/institutions/new/page.tsx
"use client";

import Link from "next/link";
import { ContentLayout } from "@/components/layout/content-layout";
import Breadcrumbs from '@/components/layout/breadcrumb';
import { InstitutionForm } from "../_components/institution-form";
import { Card, CardContent } from "@/components/ui/card";


export default function NewInstitutionPage() {
  return (
    <ContentLayout title="New Institution">
      <Breadcrumbs
        items={[
          { label: 'Home', link: '/' },
          { label: 'Institutions', link: '#' },
          { label: 'New Institution', link: '#' }
        ]}
      />

      <div className="space-y-6 mt-4">
        <div>
          <h1 className="text-2xl font-bold py-1">New Institution</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create a new educational institution
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <InstitutionForm />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}

3. Additional Components
Below are all the supporting UI components you may include under app/(routes)/organizations/institutions/_components/:

3.1. BulkUploadInstitutions
A dialog component for bulk uploading data from an Excel file. Utilizes Dialog, Table, and other shadcn/ui components:

``tsx

// _components/bulk-upload-institutions.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OrganizationService } from "@/lib/services/organization/organization-service";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const validateRow = (row: any): ValidationResult => {
  const errors: string[] = [];
  // ... your validation logic ...
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default function BulkUploadInstitutions() {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Please upload an Excel (.xlsx) file");
      return;
    }
    setSelectedFile(file);
    await processFile(file);
  };

  const processFile = async (file: File) => {
    // Read XLSX, validate each row, store in state
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const validatedData = jsonData.map((row: any, index) => {
        const validation = validateRow(row);
        return {
          ...row,
          rowNumber: index + 2, // row # in spreadsheet
          isValid: validation.isValid,
          errors: validation.errors
        };
      });
      setPreviewData(validatedData);
      setIsOpen(true);
    } catch (err) {
      toast.error("Error processing file. Please check the file format.");
      console.error(err);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    // Upload valid rows to Supabase
    try {
      setIsUploading(true);
      const validRows = previewData.filter((row) => row.isValid);
      if (validRows.length === 0) {
        toast.error("No valid data to upload");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      const promises = validRows.map(async (row) => {
        // Map row data to your DTO
        const institutionData = {
          name: row.name,
          // ...
        };
        return OrganizationService.createInstitution(institutionData)
          .then(() => successCount++)
          .catch((error) => {
            console.error(error);
            errorCount++;
          });
      });

      await Promise.all(promises);
      toast.success(
        `Successfully uploaded ${successCount} institutions. ${errorCount} failed.`
      );
      setIsOpen(false);
      clearFile();
      router.refresh();
    } catch (err) {
      toast.error("Error uploading institutions");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Bulk Upload</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
                ref={fileInputRef}
              />
              <Upload className="h-8 w-8 mb-4 text-muted-foreground" />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Excel File
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                Only .xlsx files are supported
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span>{selectedFile.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.counselling_code}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          <Badge variant={row.isValid ? "success" : "destructive"}>
                            {row.isValid ? "Valid" : "Invalid"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-destructive max-w-[200px] truncate">
                          {row.errors?.join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                clearFile();
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={isUploading || !previewData.some((row) => row.isValid)}
              >
                {isUploading ? "Uploading..." : "Upload Valid Rows"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```

3.2. DepartmentContactForm
A reusable component for gathering contact info in various departments:

```tsx

// _components/department-contact-form.tsx
"use client";

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";

interface DepartmentContactFormProps {
  form: UseFormReturn<any>;
  department: string;
  label: string;
}

export function DepartmentContactForm({ form, department, label }: DepartmentContactFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{label}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name={`departments.${department}.contact_name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter contact name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`departments.${department}.designation`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation</FormLabel>
              <FormControl>
                <Input placeholder="Enter designation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`departments.${department}.email`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`departments.${department}.mobile`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile</FormLabel>
              <FormControl>
                <Input placeholder="Enter mobile number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

---

3.3. DownloadTemplateButton
Generates and downloads an Excel template for institutions:

``tsx

// _components/download-template-button.tsx
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const SAMPLE_DATA = [
  {
    name: "JKKN College of Engineering",
    counselling_code: "JKKN_ENG",
    // ... other example fields ...
  }
];

export default function DownloadTemplateButton() {
  const handleDownload = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);

      // Example: setting column widths
      ws["!cols"] = [{ wch: 40 }, { wch: 20 }, /* etc. */];

      XLSX.utils.book_append_sheet(wb, ws, "Template");
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = `institution_upload_template_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error creating template:", error);
    }
  };

  return (
    <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto">
      <FileDown className="mr-2 h-4 w-4" />
      Download Template
    </Button>
  );
}
```

3.4. InstitutionFilter
A small search/filter bar for institutions, using Input and Select from shadcn/ui:

```tsx

// _components/institution-filters.tsx
"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { InstitutionFilters } from "@/types/organizations";

interface InstitutionFiltersProps {
  filters: InstitutionFilters;
  onFilterChange: (filters: Partial<InstitutionFilters>) => void;
}

export function InstitutionFilter({ filters, onFilterChange }: InstitutionFiltersProps) {
  const debouncedSearch = useDebounce((value: string) => {
    onFilterChange({ search: value });
  }, 300);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSearch(e.target.value);
    },
    [debouncedSearch]
  );

  return (
    <div className="space-y-4 mb-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search institutions..."
            onChange={handleSearchChange}
            defaultValue={filters.search}
            className="pl-9"
          />
        </div>

        <Select
          value={
            filters.isActive === undefined
              ? "all"
              : filters.isActive
              ? "active"
              : "inactive"
          }
          onValueChange={(value) =>
            onFilterChange({
              isActive: value === "all" ? undefined : value === "active"
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

```

3.5. InstitutionForm
A form to create or update an institution. Leverages react-hook-form + zodResolver for validation, and uses multiple shadcn/ui components: Card, Input, Select, Button, etc.

```tsx

// _components/institution-form.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";
import { Institution } from "@/types/organizations";
import { OrganizationService } from "@/lib/services/organization/organization-service";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DepartmentContactForm } from "./department-contact-form";
import { LogoUpload } from "./logo-upload";

// Zod validation schema example
const institutionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  counselling_code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Code can only contain uppercase letters, numbers, underscores, and hyphens")
    .transform((val) => val.toUpperCase()),
  institution_type: z.enum(["self", "autonomous", "aided"]).default("self"),
  category: z.enum(["ug", "pg", "ug_pg"]).default("ug"),
  accredited_by: z.string().optional(),
  address_line1: z.string().optional(),
  // ... other fields ...
  is_active: z.boolean().default(true),
  // For department contact
  departments: z
    .object({
      transportation: z
        .object({
          contact_name: z.string().optional(),
          designation: z.string().optional(),
          email: z.string().optional(),
          mobile: z.string().optional()
        })
        .optional(),
      // ...other departments...
    })
    .optional(),
});

type FormValues = z.infer<typeof institutionSchema>;

interface InstitutionFormProps {
  institution?: Institution;
  isEditing?: boolean;
}

export function InstitutionForm({ institution, isEditing }: InstitutionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: institution?.name || "",
      counselling_code: institution?.counselling_code || "",
      institution_type: institution?.institution_type || "self",
      category: institution?.category || "ug",
      accredited_by: institution?.accredited_by || "",
      // ...
      is_active: institution?.is_active ?? true,
      departments: institution?.departments || {}
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      if (isEditing && institution?.id) {
        await OrganizationService.updateInstitution(institution.id, values);
        toast.success("Institution updated successfully");
      } else {
        await OrganizationService.createInstitution(values);
        toast.success("Institution created successfully");
      }
      router.push("/organizations/institutions");
      router.refresh();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save institution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter institution name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="counselling_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Counselling Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter counselling code"
                        {...field}
                        value={field.value.toUpperCase()}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institution_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="self">Self</SelectItem>
                        <SelectItem value="autonomous">Autonomous</SelectItem>
                        <SelectItem value="aided">Aided</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional fields (category, accredited_by, etc.) */}
            </div>
          </CardContent>
        </Card>

        {/* Department Contact Form(s) */}
        <Card>
          <CardContent className="p-6 space-y-8">
            <h2 className="text-xl font-semibold">Department Contacts</h2>
            {/* Example usage */}
            <DepartmentContactForm form={form} department="transportation" label="Transportation Department" />
            {/* Add more department forms as needed */}
          </CardContent>
        </Card>

        {/* Status Switch */}
        <Card>
          <CardContent className="p-6">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Disable to temporarily hide this institution
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Logo Upload Example */}
        <Card>
          <CardContent className="p-6">
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Logo</FormLabel>
                  <FormControl>
                    <LogoUpload
                      value={field.value}
                      onChange={field.onChange}
                      onRemove={() => field.onChange("")}
                      institutionId={institution?.id || `temp-${Date.now()}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
              ? "Save Changes"
              : "Create Institution"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

3.6. InstitutionList
Displays institutions in a table with actions (edit/delete). Uses Table, DropdownMenu, and an AlertDialog for delete confirmation.

```tsx

// _components/institution-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Institution } from "@/types/organizations";
import { OrganizationService } from "@/lib/services/organization/organization-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface InstitutionListProps {
  institutions: Institution[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function InstitutionList({
  institutions,
  metadata,
  onPageChange,
  onRefresh
}: InstitutionListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);

  const handleDelete = async () => {
    if (!institutionToDelete) return;
    try {
      setIsLoading(true);
      await OrganizationService.deleteInstitution(institutionToDelete.id);
      onRefresh();
    } catch (error) {
      console.error("Error deleting institution:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete institution");
    } finally {
      setIsLoading(false);
      setInstitutionToDelete(null);
    }
  };

  const formatDate = (date: string) => format(new Date(date), "MMM d, yyyy");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Institution Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  No institutions found
                </TableCell>
              </TableRow>
            ) : (
              institutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/organizations/institutions/${institution.id}/departments`}
                      className="flex items-center hover:text-primary"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      {institution.counselling_code}
                    </Link>
                  </TableCell>
                  <TableCell>{institution.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {institution.email && (
                        <span className="text-sm text-muted-foreground">{institution.email}</span>
                      )}
                      {institution.phone && (
                        <span className="text-sm text-muted-foreground">{institution.phone}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={institution.is_active ? "default" : "secondary"}>
                      {institution.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{institution.created_at ? formatDate(institution.created_at) : ""}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/organizations/institutions/${institution.id}`}
                            className="cursor-pointer"
                          >
                            <Building2 className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/organizations/institutions/${institution.id}/edit`}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Institution
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setInstitutionToDelete(institution)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Institution
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {metadata.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(metadata.page - 1)}
            disabled={metadata.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {metadata.page} of {metadata.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(metadata.page + 1)}
            disabled={metadata.page >= metadata.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!institutionToDelete}
        onOpenChange={(open) => !open && setInstitutionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Institution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {institutionToDelete?.name}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete Institution"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

```

3.7. LogoUpload
Allows an institution to upload a logo image, using a custom StorageService for Supabase storage. Displays a preview and provides a remove button.

```tsx

// _components/logo-upload.tsx
"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { StorageService } from "@/lib/storage/storage-service";
import toast from "react-hot-toast";

interface LogoUploadProps {
  value?: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  institutionId: string;
}

export function LogoUpload({ value, onChange, onRemove, institutionId }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      setIsUploading(true);
      const file = e.target.files[0];
      // Example usage of a custom service:
      const { publicUrl, error } = await StorageService.uploadInstitutionLogo(file, institutionId);
      if (error) throw error;
      if (!publicUrl) throw new Error("Failed to get uploaded file URL");

      onChange(publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {value ? (
        <div className="relative w-24 h-24">
          <Image src={value} alt="Institution logo" fill className="object-contain" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              {isUploading ? "Uploading..." : "Upload Logo"}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

```

## 4. Putting It All Together

Pages:

- page.tsx (Institutions list)
- new/page.tsx (Create Institution)
- [id]/page.tsx (Show single Institution)
- [id]/edit/page.tsx (Edit Institution)

Sub-components:

- bulk-upload-institutions.tsx
- department-contact-form.tsx
- download-template-button.tsx
- institution-filters.tsx
- institution-form.tsx
- institution-list.tsx
- logo-upload.tsx

These pieces work together to form a complete user experience for managing institutions, all styled with shadcn/ui components and governed by your Supabase + RLS logic in the backend. Adjust the design and logic as you see fit, following the same shadcn/ui patterns for a cohesive, accessible UI.

## 5. Final Notes & Best Practices

- Keep Components Small & Composable
  Each piece (filter, form, list, etc.) does one job well.

- Use React Query for Data Fetching
  Centralize caching and re-fetch logic in hooks like useInstitutions.

- Utilize shadcn/ui
  For consistent design language, theming, and accessibility out-of-the-box.

- Validate with Zod
  Prevent invalid data from reaching the database. Combine server-side RLS with client-side checks for a secure user experience.

- Refine Error Handling
  Use toast notifications, dialogs, or error boundaries based on your team’s style guide.

With this setup, you have a robust, scalable framework for building out further modules

## 6. Summary & Best Practices

1. **Domain Types & Validation**

   - Keep your domain model in TypeScript interfaces.
   - Use Zod for robust validation of DTOs.

2. **Service Layer**

   - Abstract away Supabase calls (and any future DB changes) behind a clean API.
   - Use RLS in Supabase for security and keep your service methods minimal.

3. **React Query**

   - Simplify data fetching, caching, and synchronization.
   - Use hooks like `useQuery`, `useMutation`, and `useQueryClient.invalidateQueries()` to keep your UI reactive.

4. **UI Components**

   - Keep your presentational logic minimal.
   - For forms, consider `react-hook-form` + `zodResolver` to handle validation elegantly.
   - Use Tailwind or shadcn/ui for styling.

5. **RLS Policies**

   - Carefully set up row-level security to control read/write access.
   - Test your RLS policies with different user roles.

6. **Error Handling**

   - Decide where to handle toasts or user-facing errors (service vs. UI layer).
   - Consider building a central error boundary or hooking into React Query’s onError callbacks.

7. **Project Structure**

   - Keep your modules consistent:
     - `types/` for domain models and Zod schemas.
     - `lib/services/` for service classes.
     - `hooks/` for React Query hooks.
     - `app/` (routes) for UI components.

8. **Deployment & Migrations**
   - Use Supabase migrations or a schema migration strategy to keep your DB in sync across environments.
   - Ensure environment variables for Supabase are correctly set in production.

By following these steps, you create a maintainable, testable, and consistent architecture for any new module in your Next.js + Supabase project. Happy coding!
