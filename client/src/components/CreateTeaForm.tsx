import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeaSchema } from "@shared/schema";
import { z } from "zod";
import { useState, useMemo } from "react";
import { useCreateTea, useTeas } from "@/hooks/use-teas";
import { useTeaTypes } from "@/hooks/use-tea-types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const formSchema = insertTeaSchema;

export function CreateTeaForm({ onSuccess, isCustom = false }: { onSuccess: () => void; isCustom?: boolean }) {
  const createTea = useCreateTea();
  const { data: teaTypesList } = useTeaTypes();
  const { data: allTeas } = useTeas();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "Green",
      origin: "",
      cultivar: "",
      photoUrl: "",
    },
  });

  const nameValue = form.watch("name");

  const duplicateGlobalTea = useMemo(() => {
    if (!nameValue?.trim() || !allTeas) return null;
    const normalizedName = nameValue.trim().toLowerCase();
    return allTeas.find(
      (t: any) => !t.isCustom && t.name.toLowerCase() === normalizedName
    ) || null;
  }, [nameValue, allTeas]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isCustom && !showConfirmation) {
      setPendingValues(values);
      setShowConfirmation(true);
      return;
    }
    setShowConfirmation(false);
    setPendingValues(null);
    createTea.mutate({ ...values, isCustom } as any, {
      onSuccess: () => {
        form.reset();
        onSuccess();
      },
    });
  };

  const confirmCreate = () => {
    if (pendingValues) {
      createTea.mutate({ ...pendingValues, isCustom } as any, {
        onSuccess: () => {
          form.reset();
          setShowConfirmation(false);
          setPendingValues(null);
          onSuccess();
        },
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        {!isCustom && (
          <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-3" data-testid="global-tea-warning">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              ATTENTION: This form will add the tea GLOBALLY. It will be visible to ALL users on the website. If you only want to add it for yourself, please use "Add Custom Tea" instead.
            </p>
          </div>
        )}
        {isCustom && (
          <div className="flex items-start gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3" data-testid="custom-tea-warning">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              This tea is for your personal collection only. Other users won't be able to see it.
            </p>
          </div>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tea Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. West Lake Long Jing" {...field} data-testid="input-tea-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {duplicateGlobalTea && isCustom && (
          <div className="flex items-start gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3" data-testid="duplicate-warning">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              A tea called "<strong>{duplicateGlobalTea.name}</strong>" already exists in the global library. Your custom version will only be visible to you.
            </p>
          </div>
        )}
        {duplicateGlobalTea && !isCustom && !showConfirmation && (
          <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-3" data-testid="duplicate-global-warning">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">
              A global tea called "<strong>{duplicateGlobalTea.name}</strong>" already exists. Submitting will ask you to confirm.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(teaTypesList || []).map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origin</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Hangzhou, China" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cultivar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cultivar (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. #43" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the flavor profile, history, or appearance..." 
                  className="resize-none h-32" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showConfirmation && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4 space-y-3" data-testid="global-publish-confirmation">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Confirm Global Publication
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {duplicateGlobalTea 
                    ? `A global tea called "${duplicateGlobalTea.name}" already exists. Are you sure you want to create another global tea with the same name? This will be visible to everyone.`
                    : `Are you sure you want to publish this tea to the global library? It will be visible to all users on the website.`
                  }
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowConfirmation(false); setPendingValues(null); }} data-testid="button-cancel-confirmation">
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmCreate} disabled={createTea.isPending} data-testid="button-confirm-publication">
                {createTea.isPending ? "Publishing..." : "Yes, Publish Globally"}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onSuccess} data-testid="button-cancel-create">Cancel</Button>
          <Button type="submit" disabled={createTea.isPending || showConfirmation} className="btn-primary" data-testid="button-submit-tea">
            {createTea.isPending ? "Creating..." : isCustom ? "Create Custom Tea" : "Publish Global Tea"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
