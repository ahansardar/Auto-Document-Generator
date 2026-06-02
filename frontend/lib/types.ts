export type VariableType = "text" | "number" | "date" | "email" | "phone" | "multiline" | "currency";

export type TemplatePage = {
  page_number: number;
  width: number;
  height: number;
};

export type TextElement = {
  id: string;
  page_number: number;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font_family: string;
  font_size: number;
  font_weight: string;
  font_style: string;
  is_bold: boolean;
  is_italic: boolean;
  is_underline: boolean;
  is_strikethrough: boolean;
  text_color: string;
  background_color: string | null;
  text_opacity: number;
  background_opacity: number;
  text_align: "left" | "center" | "right" | "justify";
  vertical_align: "top" | "middle" | "bottom";
  line_height: number;
  letter_spacing: number;
  word_spacing: number;
  text_transform: "none" | "uppercase" | "lowercase" | "capitalize";
  padding_top: number;
  padding_right: number;
  padding_bottom: number;
  padding_left: number;
  border_width: number;
  border_color: string;
  border_style: "solid" | "dashed" | "dotted";
  border_radius: number;
  rotation: number;
  z_index: number;
  locked: boolean;
  auto_shrink: boolean;
  clip_overflow: boolean;
};

export type TemplateVariable = {
  id?: number;
  name: string;
  label: string;
  type: VariableType;
  required: boolean;
  default_value?: string | null;
  sample_value?: string | null;
  description?: string | null;
};

export type Template = {
  id: string;
  name: string;
  original_filename: string;
  page_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TemplateDetail = Template & {
  pages: TemplatePage[];
  text_elements: TextElement[];
  variables: TemplateVariable[];
};

export type BatchResult = {
  zip_download_url: string;
  generated_document_ids: string[];
  errors: { row: number; errors: string[] }[];
};
