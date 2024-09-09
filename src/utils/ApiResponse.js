class ApiResponse {
        constructor(data, message="Success", statuscode) {
            this.data = data;
            this.message = message;
            this.statuscode = statuscode;
            this.succcess = statuscode
    }
}
   
export default ApiResponse