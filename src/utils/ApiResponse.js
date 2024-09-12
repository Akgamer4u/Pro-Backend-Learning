class ApiResponse {
        constructor(statuscode, message="Success",data ) {
            this.data = data;
            this.message = message;
            this.statuscode = statuscode;
            this.succcess = statuscode
    }
}
   
export default ApiResponse