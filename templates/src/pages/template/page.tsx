import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@use-stall/ui";
import type { RuntimeProps } from "@use-stall/types";

const TemplatePage = ({ item }: RuntimeProps) => {
  const [search_params] = useSearchParams();
  const item_id = search_params.get("id") ?? item?.id ?? "unknown";

  return (
    <div className="h-full w-full p-5 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background p-5">
        <h1 className="text-lg font-semibold">Template Page</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a starter page from the extension template.
        </p>

        <div className="mt-4 rounded-lg border border-border p-3 text-xs">
          <div>
            <strong>Selected Item ID:</strong> {item_id}
          </div>
          <div className="mt-1 text-muted-foreground">
            Update this component and wire your own page logic.
          </div>
        </div>

        <div className="mt-4">
          <Button type="button" variant="outline" className="h-10">
            Starter Action
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TemplatePage);
