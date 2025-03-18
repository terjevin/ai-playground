"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ModelConfig } from "@/types/playground"
import { Label } from "@/components/ui/label"
import { modelCategories } from "@/lib/model-defaults"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ModelSelectorProps {
  modelConfig: ModelConfig
  onChange: (config: Partial<ModelConfig>) => void
}

export function ModelSelector({ modelConfig, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>(modelConfig.modelCategory || "reasoning")

  // Update model category when model changes
  useEffect(() => {
    const category = Object.entries(modelCategories).find(([_, models]) =>
      models.some((m) => m.id === modelConfig.model),
    )?.[0]

    if (category && category !== selectedCategory) {
      setSelectedCategory(category)
    }
  }, [modelConfig.model, selectedCategory])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    // Select the first model in the category
    const firstModel = modelCategories[category][0]
    onChange({
      modelCategory: category,
      model: firstModel.id,
      supportsReasoning: firstModel.supportsReasoning || false,
      supportsAudio: firstModel.supportsAudio || false,
    })
  }

  const handleModelSelect = (modelId: string) => {
    const selectedModel = modelCategories[selectedCategory].find((m) => m.id === modelId)
    if (selectedModel) {
      onChange({
        model: modelId,
        supportsReasoning: selectedModel.supportsReasoning || false,
        supportsAudio: selectedModel.supportsAudio || false,
      })
    }
    setOpen(false)
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4 pr-3">
        <div>
          <Label className="text-sm font-medium">Model Category</Label>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full mt-1.5">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(modelCategories).map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Model</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between mt-1.5">
                {modelConfig.model}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search model..." />
                <CommandList>
                  <CommandEmpty>No model found.</CommandEmpty>
                  <CommandGroup>
                    {modelCategories[selectedCategory].map((model) => (
                      <CommandItem key={model.id} value={model.id} onSelect={() => handleModelSelect(model.id)}>
                        <Check
                          className={cn("mr-2 h-4 w-4", modelConfig.model === model.id ? "opacity-100" : "opacity-0")}
                        />
                        {model.id}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {modelConfig.supportsReasoning && (
          <div>
            <Label className="text-sm font-medium">Reasoning Effort</Label>
            <Select value={modelConfig.reasoningEffort} onValueChange={(value) => onChange({ reasoningEffort: value })}>
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue placeholder="Select reasoning effort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {modelConfig.supportsAudio && (
          <>
            <div>
              <Label className="text-sm font-medium">Audio Language</Label>
              <Select value={modelConfig.audioLanguage} onValueChange={(value) => onChange({ audioLanguage: value })}>
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Audio Instructions</Label>
              <Textarea
                placeholder="Add specific instructions for audio transcription..."
                value={modelConfig.audioInstructions}
                onChange={(e) => onChange({ audioInstructions: e.target.value })}
                className="h-20 resize-none mt-1.5"
              />
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}

