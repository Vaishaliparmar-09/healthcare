import React from "react";
import {
  TextField,
  Grid,
  Typography,
  Box,
  InputAdornment,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import { AttachFile, Delete, Cancel, Article, Info } from "@mui/icons-material";
import CustomMuiButton from "../../../../../../components/shared/CustomMuiButton";
import AutoSelectionSearch from "../../../BasicComponents/AutoSelectionSearch";
import { Option } from "./type";

interface InvoiceCalculationsProps {
  form: any;
  subTotal: number;
  discountAmount: number;
  amountAfterDiscount: number;
  taxAmount: number;
  parsedAdjustment: number;
  totalAmount: number;
  pdaValue: number | null;
  agentReqAmount: number | null;
  agentReqPercentage: number | null;
  advancedPayment: any;
  termsOptions: Option[];
  uploadedFiles: File[];
  existingAttachments: any[];
  onFormChange: (field: string, value: any) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExistingAttachment: (index: number) => void;
  onViewTerms: () => void;
  onAttachmentClick: (attachment: any) => void;
}

const InvoiceCalculations: React.FC<InvoiceCalculationsProps> = ({
  form,
  subTotal,
  discountAmount,
  amountAfterDiscount,
  taxAmount,
  parsedAdjustment,
  totalAmount,
  pdaValue,
  agentReqAmount,
  agentReqPercentage,
  advancedPayment,
  termsOptions,
  uploadedFiles,
  existingAttachments,
  onFormChange,
  onFileUpload,
  onRemoveFile,
  onRemoveExistingAttachment,
  onViewTerms,
  onAttachmentClick,
}) => {
  return (
    <Grid container spacing={4} sx={{ mt: 2 }}>
      {/* Customer Notes and Upload Section */}
      <Grid item xs={12} md={5}>
        <TextField
          fullWidth
          size="small"
          multiline
          label="Customer Notes"
          className="mr-2"
          value={form.customerNotes}
          onChange={(e) => onFormChange("customerNotes", e.target.value)}
          sx={{ fontFamily: "Inter, sans-serif" }}
        />
        <Typography variant="caption" color="textSecondary">
          Will be displayed on the invoice
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {termsOptions.length > 0 ? (
            <AutoSelectionSearch
              options={termsOptions}
              onChange={(
                _: React.ChangeEvent<{}>,
                value: Option | Option[] | null
              ) => {
                if (Array.isArray(value)) {
                  onFormChange("selectedTerms", value);
                } else {
                  onFormChange("selectedTerms", value ? [value] : []);
                }
              }}
              value={form.selectedTerms}
              showViewIcon={true}
              onViewClick={onViewTerms}
              forceFullWidth={true}
              isClass={true}
              placeholder="Terms & Conditions"
              startAdornment={
                <Article fontSize="small" className="text-gray-600" />
              }
              multiple={true}
            />
          ) : (
            <div className="text-gray-500">
              Please add terms and conditions in organization
            </div>
          )}
        </Box>
        
        <Box sx={{ mt: 2, width: "25%" }}>
          <input
            type="file"
            multiple
            onChange={onFileUpload}
            style={{ display: "none" }}
            id="invoice-upload"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
          <label htmlFor="invoice-upload">
            <CustomMuiButton
              variant="outlined"
              component="span"
              startIcon={<AttachFile />}
              fullWidth
            >
              Upload 
            </CustomMuiButton>
          </label>

          {uploadedFiles?.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {uploadedFiles?.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {file.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onRemoveFile(index)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Existing Attachments */}
        {existingAttachments.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontFamily: "Inter, sans-serif", mb: 1 }}>
              Uploaded Attachments
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {existingAttachments?.map((att: any, index: number) => (
                <Box key={att.invoiceAttachmentId || att.description} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: "none", fontFamily: "Inter, sans-serif" }}
                    onClick={() => onAttachmentClick(att)}
                  >
                    {att.attachmentDto?.fileName || att.description}
                  </Button>
                  <IconButton size="small" onClick={() => onRemoveExistingAttachment(index)}>
                    <Cancel />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Grid>

      {/* Spacer */}
      <Grid item xs={12} md={1}></Grid>

      {/* Calculation Summary */}
      <Grid
        item
        xs={12}
        md={6}
        className="bg-gray-50 p-2 max-h-[24rem] rounded-xl"
      >
        <Grid container spacing={2} justifyContent="flex-end">
          <Grid item xs={6} textAlign="left">
            <Typography variant="body2" fontFamily={"inter"}>
              Sub Total
            </Typography>
          </Grid>
          <Grid item xs={6} textAlign="right">
            <Typography variant="body1" fontFamily={"inter"}>
              {form.currencyCode} {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Grid>

          <Grid
            item
            xs={6}
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Typography
              variant="body2"
              fontFamily={"inter"}
              sx={{ mr: 1, minWidth: "70px" }}
            >
              Discount
            </Typography>
            <TextField
              value={form.discountValue}
              onChange={(e) => {
                const value = e.target.value;
                if (form.discountType === "%" && parseFloat(value) > 100) {
                  return;
                }
                onFormChange("discountValue", value);
              }}
              size="small"
              sx={{
                width: "160px",
                "& input[type=number]": {
                  MozAppearance: "textfield",
                },
                "& input[type=number]::-webkit-outer-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
                "& input[type=number]::-webkit-inner-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
              }}
              inputProps={{
                style: { textAlign: "right" },
                min: form.discountType === '%' ? 0 : undefined,
                max: form.discountType === '%' ? 100 : undefined,
                type: form.discountType === '%' ? "number" : "text",
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Select
                      value={form.discountType}
                      onChange={(e) =>
                        onFormChange("discountType", e.target.value as "%" | "amount")
                      }
                      variant="standard"
                      size="small"
                      sx={{ width: 60 }}
                      disableUnderline
                    >
                      <MenuItem value="%">%</MenuItem>
                      <MenuItem value="amount">
                        {form.currencyCode}
                      </MenuItem>
                    </Select>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid
            item
            xs={6}
            textAlign="right"
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Typography sx={{ ml: 2 }}>
              {form.currencyCode} ({discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </Typography>
          </Grid>

          <Grid
            item
            xs={6}
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Typography
              variant="body2"
              fontFamily={"inter"}
              sx={{ mr: 1, minWidth: "70px" }}
            >
              Tax
            </Typography>
            <TextField
              value={form.taxValue}
              onChange={(e) => {
                const value = e.target.value;
                if (form.taxType === "%" && parseFloat(value) > 100) {
                  return;
                }
                onFormChange("taxValue", value);
              }}
              size="small"
              inputProps={{
                style: { textAlign: "right" },
                min: form.taxType === "%" ? 0 : undefined,
                max: form.taxType === "%" ? 100 : undefined,
                type: form.taxType === "%" ? "number" : "number",
                inputMode: form.taxType === "%" ? "numeric" : undefined,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Select
                      value={form.taxType}
                      onChange={(e) =>
                        onFormChange("taxType", e.target.value as "%" | "amount")
                      }
                      variant="standard"
                      size="small"
                      sx={{ width: 60 }}
                      disableUnderline
                    >
                      <MenuItem value="%">%</MenuItem>
                      <MenuItem value="amount">
                        {form.currencyCode}
                      </MenuItem>
                    </Select>
                  </InputAdornment>
                ),
              }}
              sx={{
                width: "160px",
                "& input[type=number]": {
                  MozAppearance: "textfield",
                },
                "& input[type=number]::-webkit-outer-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
                "& input[type=number]::-webkit-inner-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
              }}
            />
          </Grid>
          <Grid
            item
            xs={6}
            textAlign="right"
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Typography sx={{ ml: 2 }}>
              {form.currencyCode} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Grid>

          <Grid
            item
            xs={6}
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Typography
              variant="body2"
              fontFamily={"inter"}
              sx={{ mr: 1, minWidth: "70px" }}
            >
              Adjustment
            </Typography>
            <TextField
              value={form.adjustment}
              onChange={(e) => onFormChange("adjustment", e.target.value)}
              size="small"
              sx={{ width: "160px" }}
              inputProps={{ style: { textAlign: "right" } }}
            />
          </Grid>
          <Grid
            item
            xs={6}
            textAlign="right"
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Typography fontFamily={"inter"} sx={{ ml: 2 }}>
              {parsedAdjustment >= 0 ? "+" : ""} {form.currencyCode} {parsedAdjustment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Grid>

          <Grid item xs={6} textAlign="left">
            <Typography
              variant="h6"
              fontFamily={"inter"}
              sx={{ fontWeight: "bold" }}
            >
              Total ({form.currencyCode})
            </Typography>
          </Grid>
          <Grid item xs={6} textAlign="right">
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold" }}
              fontFamily={"inter"}
            >
              {form.currencyCode} {totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Grid>
          
          {form.invoiceType === "ADA" && (
            <>
              <Grid item xs={6} textAlign="left">
                <Typography variant="body2" fontFamily={"inter"}>
                  Net(PDA) <Tooltip title={`Including ${advancedPayment?.discountPercentage}% Discount and ${advancedPayment?.taxPercentage}% Tax  `}><Info sx={{color:"#636363"}} fontSize="small"/></Tooltip>
                </Typography>
              </Grid>
              <Grid item xs={6} textAlign="right">
                <Typography variant="body1" fontFamily={"inter"}>
                  {form.currencyCode} {pdaValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};

export default InvoiceCalculations;