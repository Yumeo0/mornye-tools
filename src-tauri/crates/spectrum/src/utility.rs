use miniz_oxide::inflate::{DecompressError, decompress_to_vec_zlib};

#[inline]
pub fn requires_decompression(msg_type: u8) -> bool {
    msg_type == 17 || msg_type == 18 || msg_type == 20
}

pub fn decompress(data: Vec<u8>) -> Result<Vec<u8>, DecompressError> {
    decompress_to_vec_zlib(&data)
}
